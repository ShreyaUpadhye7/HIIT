// server.js
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();

// --- Cloudinary Config ---
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const crypto = require('crypto');
const multer = require('multer');
const { Parser } = require('json2csv');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

// Configure multer for file uploads to MEMORY
const storage = multer.memoryStorage(); // Use memoryStorage instead of diskStorage

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png/;
        const extname = filetypes.test(file.originalname.substring(file.originalname.lastIndexOf('.')));
        const mimetype = filetypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Only JPEG and PNG images are allowed.'));
    },
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// --- Database Connection ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB Connected...'))
    .catch(err => {
        console.error('MongoDB Connection Error:', err.message);
        process.exit(1);
    });

// --- Schemas ---
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    userType: { type: String, required: true },
    isEmailVerified: { type: Boolean, default: false },
    registrationDate: { type: Date, default: Date.now },
    hasAcceptedDisclaimer: { type: Boolean, default: false },
    name: String,
    dob: Date,
    counselorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
});
const User = mongoose.model('User', UserSchema);

const OTPSchema = new mongoose.Schema({
    email: { type: String, required: true },
    otp: { type: String, required: true },
    otpType: { type: String, enum: ['registration', 'login'], required: true },
    createdAt: { type: Date, default: Date.now, expires: 300 } // 5 minutes
});
const OTP = mongoose.model('OTP', OTPSchema);

const OTPRequestSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    requestCount: { type: Number, default: 0 },
    firstRequestTime: { type: Date, default: Date.now }
});
const OTPRequest = mongoose.model('OTPRequest', OTPRequestSchema);

const ResetTokenSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    token: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: 3600 } // 1 hour
});
const ResetToken = mongoose.model('ResetToken', ResetTokenSchema);

const HandwritingSampleSchema = new mongoose.Schema({
    patientId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    patientPID: String,
    date: { type: Date, default: Date.now },
    imageUrl: { type: String, required: true },
    aiPrediction: { type: String, required: true },
    confidence: { type: Number, required: true },
    scores: Object,
    features: Object,
    status: { type: String, enum: ['pending', 'reviewed'], default: 'pending' },
    graphologistReview: {
        wordSpacing: String,
        pressure: String,
        qualitativeAnalysis: String,
        aiAgreement: { type: String, enum: ['Agree', 'Disagree'] },
        reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reviewDate: Date
    },
    consentedForResearch: { type: Boolean, default: false }
});
const HandwritingSample = mongoose.model('HandwritingSample', HandwritingSampleSchema);

const AnalysisResultSchema = new mongoose.Schema({
    patientId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    date: { type: Date, default: Date.now },
    imageAnalysis: {
        outcome: String,
        confidence: Number,
        scores: Object,
        features: Object
    },
    questionnaireAnalysis: {
        outcome: String,
        score: Number,
        subscaleScores: [{
            subscaleId: String,
            description: String,
            average: Number
        }],
        rawAnswers: Object
    },
    combinedOutcome: String,
    graphData: [{
        label: String,
        value: Number
    }]
});
const AnalysisResult = mongoose.model('AnalysisResult', AnalysisResultSchema);

// --- Nodemailer Config ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// --- Helpers ---
const generateOTP = () => crypto.randomInt(100000, 999999).toString();
const generateResetToken = () => crypto.randomBytes(32).toString('hex');

async function sendOTPEmail(email, otp) {
    const subject = 'Handwriting App - Email Verification Code';
    const message = `Your verification code is: ${otp}. This code is valid for 5 minutes.`;
    try {
        await transporter.sendMail({
            from: `"Handwriting App" <${process.env.EMAIL_USER}>`,
            to: email,
            subject,
            html: `<h2>${subject}</h2><p>${message}</p>`
        });
    } catch (error) {
        console.error('Nodemailer send error:', error);
        throw new Error('Failed to send OTP email: ' + error.message);
    }
}

async function sendResetPasswordEmail(email, token) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
    const subject = 'Handwriting App - Password Reset Request';
    const message = `You requested a password reset. Click the link below to reset your password. This link is valid for 1 hour:\n\n<a href="${resetUrl}">${resetUrl}</a>`;
    try {
        await transporter.sendMail({
            from: `"Handwriting App" <${process.env.EMAIL_USER}>`,
            to: email,
            subject,
            html: `<h2>${subject}</h2><p>${message}</p>`
        });
    } catch (error) {
        console.error('Nodemailer send error:', error);
        throw new Error('Failed to send reset password email: ' + error.message);
    }
}

// --- Rate Limiting Middleware ---
async function checkOTPRequests(email) {
    const TIME_WINDOW_MINUTES = 15;
    const MAX_REQUESTS = 5;
    const now = new Date();
    const record = await OTPRequest.findOneAndUpdate(
        { email },
        { $setOnInsert: { firstRequestTime: now }, $inc: { requestCount: 1 } },
        { upsert: true, new: true }
    );
    const timeDiff = (now - record.firstRequestTime) / 60000;
    if (timeDiff > TIME_WINDOW_MINUTES) {
        record.requestCount = 1;
        record.firstRequestTime = now;
        await record.save();
        return { allowed: true };
    }
    if (record.requestCount > MAX_REQUESTS) {
        const waitTime = Math.ceil(TIME_WINDOW_MINUTES - timeDiff);
        return { allowed: false, waitMinutes: waitTime };
    }
    return { allowed: true };
}

// --- JWT Middleware ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    // Explicitly handle the case where no token is provided.
    if (token == null || token.toLowerCase() === 'null') {
        return res.status(401).json({ message: 'Authorization token is missing.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.error('JWT verification error:', err);
            // Provide a more specific message for different JWT errors
            if (err.name === 'TokenExpiredError') {
                return res.status(403).json({ message: 'Authorization token has expired. Please log in again.' });
            }
            if (err.name === 'JsonWebTokenError') {
                return res.status(403).json({ message: 'Invalid token. Please log in again.' });
            }
            return res.status(403).json({ message: 'Invalid or expired token.' });
        }
        req.user = user;
        next();
    });
};

const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.userType)) {
            return res.status(403).json({ message: 'Access denied.' });
        }
        next();
    };
};

// =======================
// API ROUTES
// =======================

// REGISTER - send OTP
app.post('/api/register', async (req, res) => {
    try {
        const { email, phone, password, userType, name, dob } = req.body;
        if (!email || !phone || !password || !userType) {
            return res.status(400).json({ message: 'Missing required fields.' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'User with this email already exists.' });

        const limit = await checkOTPRequests(email);
        if (!limit.allowed) {
            return res.status(429).json({
                message: `Too many OTP requests. Please try again in ${limit.waitMinutes} minutes.`
            });
        }

        const otp = generateOTP();
        await OTP.findOneAndDelete({ email, otpType: 'registration' });
        await OTP.create({ email, otp, otpType: 'registration' });
        await sendOTPEmail(email, otp);

        res.status(200).json({
            message: 'OTP sent to your email. Please verify to complete registration.',
            tempUserData: { email, phone, password, userType, name, dob }
        });
    } catch (error) {
        console.error('Registration OTP Send Error:', error);
        res.status(500).json({ message: error.message || 'Server error during registration.' });
    }
});

// VERIFY REGISTRATION OTP
app.post('/api/verify-registration', async (req, res) => {
    try {
        const { email, phone, password, userType, otp, name, dob } = req.body;
        const otpRecord = await OTP.findOne({ email, otpType: 'registration' });
        if (!otpRecord || otpRecord.otp !== otp) {
            return res.status(400).json({ message: 'Invalid or expired OTP.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({
            email, phone, password: hashedPassword, userType,
            isEmailVerified: true, name, dob
        });

        await OTP.deleteOne({ _id: otpRecord._id });
        await OTPRequest.deleteOne({ email });

        const token = jwt.sign(
            { id: newUser._id, userType: newUser.userType },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(201).json({
            message: 'Registration successful!',
            token,
            user: {
                _id: newUser._id,
                email: newUser.email,
                phone: newUser.phone,
                userType: newUser.userType,
                registrationDate: newUser.registrationDate,
                name: newUser.name,
                dob: newUser.dob
            },
            isFirstLogin: true
        });
    } catch (error) {
        console.error('Verify Registration Error:', error);
        res.status(500).json({ message: error.message || 'Server error during registration verification.' });
    }
});

// LOGIN
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'Invalid credentials.' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials.' });

        const isFirstLogin = !user.hasAcceptedDisclaimer;
        // Don't automatically mark as accepted - let the client handle this

        const token = jwt.sign(
            { id: user._id, userType: user.userType },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(200).json({
            message: 'Login successful!',
            token,
            user: {
                _id: user._id,
                email: user.email,
                phone: user.phone,
                userType: user.userType,
                registrationDate: user.registrationDate,
                name: user.name,
                dob: user.dob
            },
            isFirstLogin
        });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: error.message || 'Server error during login.' });
    }
});

// RESEND OTP
app.post('/api/resend-otp', async (req, res) => {
    try {
        const { email } = req.body;
        const limit = await checkOTPRequests(email);
        if (!limit.allowed) {
            return res.status(429).json({
                message: `Too many OTP requests. Please try again in ${limit.waitMinutes} minutes.`
            });
        }

        const otp = generateOTP();
        await OTP.findOneAndDelete({ email, otpType: 'registration' });
        await OTP.create({ email, otp, otpType: 'registration' });
        await sendOTPEmail(email, otp);

        res.status(200).json({ message: 'New OTP sent to your email.' });
    } catch (error) {
        console.error('Resend OTP Error:', error);
        res.status(500).json({ message: error.message || 'Server error while resending OTP.' });
    }
});

// FORGOT PASSWORD
app.post('/api/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email is required.' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User with this email does not exist.' });
        }

        const limit = await checkOTPRequests(email);
        if (!limit.allowed) {
            return res.status(429).json({
                message: `Too many requests. Please try again in ${limit.waitMinutes} minutes.`
            });
        }

        const token = generateResetToken();
        await ResetToken.create({ userId: user._id, token });

        await sendResetPasswordEmail(email, token);

        res.status(200).json({ message: 'Password reset link sent to your email.' });
    } catch (error) {
        console.error('Forgot Password Error:', error);
        res.status(500).json({ message: error.message || 'Server error while processing password reset.' });
    }
});

// RESET PASSWORD
app.post('/api/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res.status(400).json({ message: 'Token and new password are required.' });
        }

        const resetToken = await ResetToken.findOne({ token });
        if (!resetToken) {
            return res.status(400).json({ message: 'Invalid or expired reset token.' });
        }

        const user = await User.findById(resetToken.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        await ResetToken.deleteOne({ _id: resetToken._id });

        res.status(200).json({ message: 'Password reset successfully.' });
    } catch (error) {
        console.error('Reset Password Error:', error);
        res.status(500).json({ message: error.message || 'Server error while resetting password.' });
    }
});

// ACCEPT DISCLAIMER
app.post('/api/accept-disclaimer', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        user.hasAcceptedDisclaimer = true;
        await user.save();

        res.status(200).json({ message: 'Disclaimer accepted successfully!' });
    } catch (error) {
        console.error('Accept Disclaimer Error:', error);
        res.status(500).json({ message: error.message || 'Server error while accepting disclaimer.' });
    }
});

// RESET DISCLAIMER (for testing or admin purposes)
app.post('/api/reset-disclaimer', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        user.hasAcceptedDisclaimer = false;
        await user.save();

        res.status(200).json({ message: 'Disclaimer reset successfully! User will see disclaimer on next login.' });
    } catch (error) {
        console.error('Reset Disclaimer Error:', error);
        res.status(500).json({ message: error.message || 'Server error while resetting disclaimer.' });
    }
});

// UPDATE PROFILE
app.post('/api/update-profile', authenticateToken, async (req, res) => {
    try {
        const { name, phone, dob } = req.body;
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        user.name = name || user.name;
        user.phone = phone || user.phone;
        user.dob = dob ? new Date(dob) : user.dob;

        await user.save();

        res.status(200).json({
            message: 'Profile updated successfully!',
            user: {
                _id: user._id,
                email: user.email,
                phone: user.phone,
                userType: user.userType,
                registrationDate: user.registrationDate,
                name: user.name,
                dob: user.dob
            }
        });
    } catch (error) {
        console.error('Update Profile Error:', error);
        res.status(500).json({ message: error.message || 'Server error during profile update.' });
    }
});

// UPLOAD HANDWRITING SAMPLE - NOW FOR COUNSELOR
const DAYS_BETWEEN_UPLOADS = 20;
app.post('/api/upload-sample', authenticateToken, authorizeRoles('Counselor'), upload.single('image'), async (req, res) => {
    try {
        const { patientId, patientPID } = req.body;
        if (!req.file || !patientId || !patientPID) {
            return res.status(400).json({ message: 'Image, patientId, and patientPID are required.' });
        }

        const lastSample = await HandwritingSample.findOne({ patientId }).sort({ date: -1 });
        if (lastSample) {
            const timeDifference = new Date() - new Date(lastSample.date);
            const daysDifference = timeDifference / (1000 * 60 * 60 * 24);
            if (daysDifference < DAYS_BETWEEN_UPLOADS) {
                const nextSubmissionDate = new Date(lastSample.date);
                nextSubmissionDate.setDate(nextSubmissionDate.getDate() + DAYS_BETWEEN_UPLOADS);
                return res.status(403).json({
                    message: `The patient must wait 20 days between uploads. Their next submission is available on ${nextSubmissionDate.toLocaleDateString()}.`,
                    lastSubmissionDate: lastSample.date.toISOString()
                });
            }
        }

        // === START: MODIFIED UPLOAD LOGIC ===

        // 1. Send to Python API (using buffer from memory)
        const form = new FormData();
        form.append('file', req.file.buffer, { filename: req.file.originalname });

        let aiResponse;
        try {
            // Use the environment variable for the Python API URL
            const pythonApiUrl = process.env.PYTHON_API_URL || 'http://localhost:5000/analyze';
            const response = await axios.post(pythonApiUrl, form, {
                headers: { ...form.getHeaders() }
            });
            aiResponse = response.data;

            if (aiResponse.error) {
                console.error('AI Server returned an error:', aiResponse.error);
                throw new Error(aiResponse.error);
            }

        } catch (aiError) {
            console.error('AI Server Communication Error:', aiError.message);
            return res.status(500).json({ message: `Failed to analyze image. Reason: ${aiError.message}` });
        }

        // 2. Upload to Cloudinary (using buffer from memory)
        let cloudinaryUploadResponse;
        try {
            cloudinaryUploadResponse = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    { folder: "handwriting-samples" }, // You can name this folder anything
                    (error, result) => {
                        if (error) return reject(error);
                        resolve(result);
                    }
                );
                uploadStream.end(req.file.buffer);
            });
        } catch (uploadError) {
            console.error('Cloudinary Upload Error:', uploadError.message);
            return res.status(500).json({ message: `Failed to save image. Reason: ${uploadError.message}` });
        }

        // 3. Use the new Cloudinary URL
        const imageUrl = cloudinaryUploadResponse.secure_url; // This is the permanent URL

        // === END: MODIFIED UPLOAD LOGIC ===

        const aiPrediction = aiResponse.prediction;
        const totalScore = (aiResponse.scores?.relapse || 0) + (aiResponse.scores?.recovery || 0);
        const confidence = totalScore > 0
            ? ((Math.max(aiResponse.scores.relapse, aiResponse.scores.recovery) / totalScore) * 100).toFixed(1)
            : 50.0;

        const sample = await HandwritingSample.create({
            patientId,
            patientPID,
            imageUrl, // Use the new Cloudinary URL
            aiPrediction,
            confidence,
            scores: aiResponse.scores,
            features: aiResponse.features
        });

        res.status(200).json({
            message: 'Sample uploaded and analyzed successfully!',
            aiPrediction,
            confidence,
            sampleId: sample._id,
            scores: aiResponse.scores,
            features: aiResponse.features
        });
    } catch (error) {
        console.error('Upload Sample Error:', error);
        res.status(500).json({ message: error.message || 'Server error during sample upload.' });
    }
});

// GET PATIENT SUBMISSION STATUS (FOR COUNSELOR)
app.get('/api/counselor/submission-status/:patientId', authenticateToken, authorizeRoles('Counselor'), async (req, res) => {
    try {
        const { patientId } = req.params;
        const patient = await User.findById(patientId);
        if (!patient || patient.counselorId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized access to this patient.' });
        }

        const lastSample = await HandwritingSample.findOne({ patientId }).sort({ date: -1 });
        let canSubmit = true;
        let lastSubmissionDate = null;
        if (lastSample) {
            lastSubmissionDate = lastSample.date.toISOString();
            const timeDifference = new Date() - new Date(lastSample.date);
            const daysDifference = timeDifference / (1000 * 60 * 60 * 24);
            if (daysDifference < DAYS_BETWEEN_UPLOADS) {
                canSubmit = false;
            }
        }
        res.status(200).json({ canSubmit, lastSubmissionDate });
    } catch (error) {
        console.error('Get Submission Status Error:', error);
        res.status(500).json({ message: error.message || 'Server error while fetching submission status.' });
    }
});

// SET PATIENT CONSENT FOR RESEARCH (FOR COUNSELOR)
app.post('/api/counselor/consent', authenticateToken, authorizeRoles('Counselor'), async (req, res) => {
    try {
        const { patientId, sampleId, consent } = req.body;
        const sample = await HandwritingSample.findById(sampleId);
        if (!sample || sample.patientId.toString() !== patientId) {
            return res.status(403).json({ message: 'Unauthorized access.' });
        }
        sample.consentedForResearch = consent;
        await sample.save();
        res.status(200).json({ message: 'Consent updated successfully.' });
    } catch (error) {
        console.error('Update Consent Error:', error);
        res.status(500).json({ message: error.message || 'Server error while updating consent.' });
    }
});

// GET USER HISTORY (for specific patient)
app.get('/api/history/:userId', authenticateToken, authorizeRoles('Patient', 'Counselor', 'Researcher', 'Graphologist'), async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Patients can only access their own history
        if (req.user.userType === 'Patient' && req.user.id !== userId) {
            return res.status(403).json({ message: 'Unauthorized access.' });
        }
        
        // Counselors can only access their patients' history
        if (req.user.userType === 'Counselor') {
            const patient = await User.findById(userId);
            if (!patient || patient.counselorId.toString() !== req.user.id) {
                return res.status(403).json({ message: 'Unauthorized access to this patient.' });
            }
        }
        
        const history = await AnalysisResult.find({ patientId: userId }).sort({ date: -1 });
        res.status(200).json(history);
    } catch (error) {
        console.error('Get History Error:', error);
        res.status(500).json({ message: error.message || 'Server error while fetching history.' });
    }
});

// SAVE ANALYSIS RESULT
app.post('/api/save-analysis', authenticateToken, authorizeRoles('Counselor'), async (req, res) => {
    try {
        const { patientId, date, imageAnalysis, questionnaireAnalysis, combinedOutcome, graphData } = req.body;
        if (!imageAnalysis || !questionnaireAnalysis || !combinedOutcome || !graphData || !patientId) {
            return res.status(400).json({ message: 'Missing required fields.' });
        }

        const patient = await User.findById(patientId);
        if (!patient || patient.counselorId.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized to save analysis for this patient.' });
        }

        const analysis = await AnalysisResult.create({
            patientId,
            date: new Date(date),
            imageAnalysis,
            questionnaireAnalysis,
            combinedOutcome,
            graphData
        });

        res.status(201).json({
            message: 'Analysis saved successfully!',
            analysisId: analysis._id
        });
    } catch (error) {
        console.error('Save Analysis Error:', error);
        res.status(500).json({ message: error.message || 'Server error while saving analysis.' });
    }
});

// GET PENDING SAMPLES FOR GRAPHOLOGIST
app.get('/api/graphologist/pending-samples', authenticateToken, authorizeRoles('Graphologist'), async (req, res) => {
    try {
        // Find samples that have been consented for research
        const samples = await HandwritingSample.find({ 
            status: 'pending', 
            consentedForResearch: true 
        }).select('patientId patientPID date aiPrediction confidence imageUrl _id');

        res.status(200).json(samples);
    } catch (error) {
        console.error('Get Pending Samples Error:', error);
        res.status(500).json({ message: error.message || 'Server error while fetching pending samples.' });
    }
});

// SUBMIT GRAPHOLOGIST REVIEW
app.post('/api/graphologist/submit-review', authenticateToken, authorizeRoles('Graphologist'), async (req, res) => {
    try {
        const { sampleId, wordSpacing, pressure, qualitativeAnalysis, aiAgreement } = req.body;
        const reviewedBy = req.user.id;

        const sample = await HandwritingSample.findById(sampleId);
        if (!sample) {
            return res.status(404).json({ message: 'Sample not found.' });
        }

        sample.status = 'reviewed';
        sample.graphologistReview = {
            wordSpacing,
            pressure,
            qualitativeAnalysis,
            aiAgreement,
            reviewedBy,
            reviewDate: new Date()
        };

        await sample.save();

        res.status(200).json({ message: 'Review submitted successfully!' });
    } catch (error) {
        console.error('Submit Review Error:', error);
        res.status(500).json({ message: error.message || 'Server error while submitting review.' });
    }
});

// GET RESEARCHER STATISTICS
app.get('/api/researcher/statistics', authenticateToken, authorizeRoles('Researcher'), async (req, res) => {
    try {
        // Aggregated data from AnalysisResult
        const results = await AnalysisResult.find();
        const totalAnalyses = results.length;
        const recoveryCount = results.filter(r => r.combinedOutcome === 'Recovery').length;
        const recoveryRate = totalAnalyses > 0 ? ((recoveryCount / totalAnalyses) * 100).toFixed(1) : 0;
        const relapseRiskRate = totalAnalyses > 0 ? (100 - parseFloat(recoveryRate)).toFixed(1) : 0;

        const ageGroups = [
            { range: '18-30', minAge: 18, maxAge: 30, recovery: 0, relapse: 0 },
            { range: '31-45', minAge: 31, maxAge: 45, recovery: 0, relapse: 0 },
            { range: '46-60', minAge: 46, maxAge: 60, recovery: 0, relapse: 0 },
            { range: '60+', minAge: 61, maxAge: 120, recovery: 0, relapse: 0 }
        ];

        const users = await User.find().select('dob');
        const userMap = new Map(users.map(user => [user._id.toString(), user]));

        // Add a counter for cases without age data
        let casesWithoutAge = 0;

        for (const result of results) {
            if (result.patientId) {
                const user = userMap.get(result.patientId.toString());
                if (user && user.dob) {
                    // More accurate age calculation
                    const today = new Date();
                    const birthDate = new Date(user.dob);
                    let age = today.getFullYear() - birthDate.getFullYear();
                    const monthDiff = today.getMonth() - birthDate.getMonth();
                    
                    // Adjust age if birthday hasn't occurred this year
                    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                        age--;
                    }
                    
                    const group = ageGroups.find(g => age >= g.minAge && age <= g.maxAge);
                    if (group) {
                        if (result.combinedOutcome === 'Recovery') {
                            group.recovery += 1;
                        } else {
                            group.relapse += 1;
                        }
                    } else {
                        // Age outside defined ranges, add to a catch-all
                        if (age < 18) {
                            // Add to 18-30 group for now
                            if (result.combinedOutcome === 'Recovery') {
                                ageGroups[0].recovery += 1;
                            } else {
                                ageGroups[0].relapse += 1;
                            }
                        } else if (age > 60) {
                            // Add to 46-60 group for now
                            if (result.combinedOutcome === 'Recovery') {
                                ageGroups[2].recovery += 1;
                            } else {
                                ageGroups[2].relapse += 1;
                            }
                        }
                    }
                } else {
                    // No age data available - assign to default group (18-30)
                    casesWithoutAge++;
                    if (result.combinedOutcome === 'Recovery') {
                        ageGroups[0].recovery += 1;
                    } else {
                        ageGroups[0].relapse += 1;
                    }
                }
            }
        }

        // Update age group labels to show missing data
        if (casesWithoutAge > 0) {
            ageGroups[0].range = `18-30 (${casesWithoutAge} unknown age)`;
        }

        // AI vs. Human Review data from HandwritingSample (graphologist reviews)
        const reviewedSamples = await HandwritingSample.find({ 'graphologistReview.aiAgreement': { $exists: true } });
        const reviewComparison = [
            { scenario: 'AI & Graphologist both predicted Recovery', count: 0 },
            { scenario: 'AI & Graphologist both predicted Relapse', count: 0 },
            { scenario: 'AI predicted Recovery, Graphologist Disagreed', count: 0 },
            { scenario: 'AI predicted Relapse, Graphologist Disagreed', count: 0 },
            { scenario: 'AI Predictions (No Human Review Yet)', count: 0 },
        ];

        // Count graphologist-reviewed samples
        reviewedSamples.forEach(sample => {
            const aiPrediction = sample.aiPrediction;
            const humanAgreement = sample.graphologistReview.aiAgreement;
            if (humanAgreement === 'Agree') {
                if (aiPrediction === 'Recovery') {
                    reviewComparison[0].count++;
                } else {
                    reviewComparison[1].count++;
                }
            } else { // Disagree
                if (aiPrediction === 'Recovery') {
                    reviewComparison[2].count++;
                } else {
                    reviewComparison[3].count++;
                }
            }
        });

        // Count AI predictions from AnalysisResult that haven't been reviewed by graphologists yet
        const allSamples = await HandwritingSample.find({});
        const unreviewed = allSamples.filter(sample => !sample.graphologistReview || !sample.graphologistReview.aiAgreement);
        reviewComparison[4].count = unreviewed.length;

        // Calculate real feature correlations from actual data
        const featureCorrelations = [];
        
        if (results.length > 0) {
            // Get all samples with features data
            const samplesWithFeatures = await HandwritingSample.find({ features: { $exists: true } });
            
            if (samplesWithFeatures.length > 0) {
                // Define feature mappings
                const featureMap = {
                    'Word Spacing': 'spacing',
                    'Pressure': 'pressure', 
                    'G-Loop': 'g_loop',
                    'Y-Loop': 'y_loop',
                    'Letter Size': 'letter_size',
                    'Slant Angle': 'slant'
                };
                
                // Calculate correlation for each feature
                Object.entries(featureMap).forEach(([displayName, featureKey]) => {
                    const validSamples = samplesWithFeatures.filter(sample => 
                        sample.features && sample.features[featureKey] !== undefined
                    );
                    
                    if (validSamples.length > 1) {
                        // Simple correlation calculation
                        const recoveryCount = validSamples.filter(s => s.aiPrediction === 'Recovery').length;
                        const totalCount = validSamples.length;
                        const recoveryRate = recoveryCount / totalCount;
                        
                        // Calculate feature average for recovery vs relapse
                        const recoveryFeatures = validSamples
                            .filter(s => s.aiPrediction === 'Recovery')
                            .map(s => parseFloat(s.features[featureKey]) || 0);
                        const relapseFeatures = validSamples
                            .filter(s => s.aiPrediction !== 'Recovery')
                            .map(s => parseFloat(s.features[featureKey]) || 0);
                        
                        if (recoveryFeatures.length > 0 && relapseFeatures.length > 0) {
                            const recoveryAvg = recoveryFeatures.reduce((a, b) => a + b, 0) / recoveryFeatures.length;
                            const relapseAvg = relapseFeatures.reduce((a, b) => a + b, 0) / relapseFeatures.length;
                            
                            // Simple correlation based on difference between groups
                            const correlation = Math.abs(recoveryAvg - relapseAvg) / Math.max(recoveryAvg, relapseAvg, 1);
                            featureCorrelations.push({
                                feature: displayName,
                                correlation: Math.min(correlation, 0.99).toFixed(2)
                            });
                        }
                    }
                });
            }
        }
        
        // Fallback to default features if no data available
        if (featureCorrelations.length === 0) {
            featureCorrelations.push(
                { feature: 'Word Spacing', correlation: 'N/A' },
                { feature: 'Pressure', correlation: 'N/A' },
                { feature: 'G-Loop', correlation: 'N/A' },
                { feature: 'Y-Loop', correlation: 'N/A' },
                { feature: 'Letter Size', correlation: 'N/A' },
                { feature: 'Slant Angle', correlation: 'N/A' }
            );
        }

        res.status(200).json({
            totalAnalyses,
            recoveryRate,
            relapseRiskRate,
            ageGroups,
            featureCorrelations,
            reviewComparison
        });
    } catch (error) {
        console.error('Researcher Statistics Error:', error);
        res.status(500).json({ message: error.message || 'Server error while fetching statistics.' });
    }
});

// DEBUG ENDPOINT - Get detailed analysis data for troubleshooting
app.get('/api/researcher/debug', authenticateToken, authorizeRoles('Researcher'), async (req, res) => {
    try {
        const results = await AnalysisResult.find().populate('patientId', 'dob email name');
        const debugData = results.map(result => {
            const age = result.patientId && result.patientId.dob ? 
                new Date().getFullYear() - new Date(result.patientId.dob).getFullYear() : 'No DOB';
            return {
                date: result.date,
                outcome: result.combinedOutcome,
                patientAge: age,
                patientDOB: result.patientId?.dob || 'Not provided',
                patientEmail: result.patientId?.email || 'Unknown'
            };
        });
        res.status(200).json(debugData);
    } catch (error) {
        console.error('Debug Error:', error);
        res.status(500).json({ message: error.message });
    }
});

// EXPORT DATA AS CSV
app.get('/api/researcher/export', authenticateToken, authorizeRoles('Researcher'), async (req, res) => {
    try {
        const results = await AnalysisResult.find().lean();
        if (results.length === 0) {
            return res.status(404).json({ message: 'No analysis data available for export.' });
        }

        const fields = [
            { label: 'Patient ID', value: 'patientId' },
            { label: 'Date', value: 'date', default: '' },
            { label: 'Image Analysis Outcome', value: 'imageAnalysis.outcome', default: '' },
            { label: 'Image Analysis Confidence', value: 'imageAnalysis.confidence', default: '' },
            { label: 'Questionnaire Outcome', value: 'questionnaireAnalysis.outcome', default: '' },
            { label: 'Questionnaire Score', value: 'questionnaireAnalysis.score', default: '' },
            { label: 'Combined Outcome', value: 'combinedOutcome', default: '' },
            { label: 'Subscale 1 Average', value: 'questionnaireAnalysis.subscaleScores.0.average', default: '' },
            { label: 'Subscale 2 Average', value: 'questionnaireAnalysis.subscaleScores.1.average', default: '' },
            { label: 'Subscale 3 Average', value: 'questionnaireAnalysis.subscaleScores.2.average', default: '' },
            { label: 'Subscale 4 Average', value: 'questionnaireAnalysis.subscaleScores.3.average', default: '' },
            { label: 'Subscale 5 Average', value: 'questionnaireAnalysis.subscaleScores.4.average', default: '' }
        ];

        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(results);

        res.header('Content-Type', 'text/csv');
        res.attachment('analysis_data.csv');
        res.status(200).send(csv);
    } catch (error) {
        console.error('Export Data Error:', error);
        res.status(500).json({ message: error.message || 'Server error while exporting data.' });
    }
});

// COUNSELOR REGISTERS NEW PATIENT
app.post('/api/counselor/register-patient', authenticateToken, authorizeRoles('Counselor'), async (req, res) => {
    try {
        const { email, password, name, phone, dob } = req.body;
        if (!email || !password || !name || !phone || !dob) {
            return res.status(400).json({ message: 'Missing required fields.' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'A user with this email already exists.' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newPatient = await User.create({
            email,
            password: hashedPassword,
            name,
            phone,
            dob,
            userType: 'Patient',
            isEmailVerified: true, 
            hasAcceptedDisclaimer: true,
            counselorId: req.user.id
        });

        // Generate PID for the new patient
        const generatePID = (userId) => `P-${userId.toString().substring(userId.toString().length - 6).toUpperCase()}`;
        const patientWithPID = { ...newPatient.toObject(), pid: generatePID(newPatient._id) };

        res.status(201).json({
            message: 'Patient registered successfully.',
            patient: patientWithPID
        });
    } catch (error) {
        console.error('Counselor Register Patient Error:', error);
        res.status(500).json({ message: error.message || 'Server error while registering patient.' });
    }
});

// GET PATIENTS FOR COUNSELOR
app.get('/api/counselor/patients', authenticateToken, authorizeRoles('Counselor'), async (req, res) => {
    try {
        const patients = await User.find({ counselorId: req.user.id, userType: 'Patient' }).select('-password -isEmailVerified -hasAcceptedDisclaimer');
        const patientsWithPIDs = patients.map(patient => {
            const generatePID = (userId) => `P-${userId.toString().substring(userId.toString().length - 6).toUpperCase()}`;
            return { ...patient.toObject(), pid: generatePID(patient._id) };
        });
        res.status(200).json(patientsWithPIDs);
    } catch (error) {
        console.error('Get Patients Error:', error);
        res.status(500).json({ message: error.message || 'Server error while fetching patients.' });
    }
});

// GET COUNSELOR ALL ANALYSES (for counselor history page)
app.get('/api/counselor/all-analyses', authenticateToken, authorizeRoles('Counselor'), async (req, res) => {
    try {
        // Get all patients under this counselor
        const patients = await User.find({ counselorId: req.user.id }).select('_id name email');
        const patientIds = patients.map(p => p._id);
        
        // Get all analyses for these patients
        const analyses = await AnalysisResult.find({ 
            patientId: { $in: patientIds } 
        }).populate('patientId', 'name email').sort({ date: -1 });

        // Add patient PID to each analysis for display
        const analysesWithPID = analyses.map(analysis => {
            const patientPID = analysis.patientId ? `P-${analysis.patientId._id.toString().substring(analysis.patientId._id.toString().length - 6).toUpperCase()}` : 'Unknown';
            return {
                ...analysis.toObject(),
                patientPID
            };
        });

        res.status(200).json(analysesWithPID);
    } catch (error) {
        console.error('Get Counselor All Analyses Error:', error);
        res.status(500).json({ message: error.message || 'Server error while fetching analyses.' });
    }
});

// GET COUNSELOR SUMMARY STATISTICS
app.get('/api/counselor/summary', authenticateToken, authorizeRoles('Counselor'), async (req, res) => {
    try {
        // Get all patients under this counselor
        const patients = await User.find({ counselorId: req.user.id }).select('_id');
        const patientIds = patients.map(p => p._id);
        
        // Get all analyses for these patients
        const analyses = await AnalysisResult.find({ patientId: { $in: patientIds } });
        
        const totalAnalyses = analyses.length;
        const recoveryCount = analyses.filter(a => a.combinedOutcome === 'Recovery').length;
        const relapseCount = totalAnalyses - recoveryCount;
        
        res.status(200).json({
            totalPatients: patients.length,
            totalAnalyses,
            recoveryCount,
            relapseCount,
            recoveryRate: totalAnalyses > 0 ? ((recoveryCount / totalAnalyses) * 100).toFixed(1) : 0
        });
    } catch (error) {
        console.error('Get Counselor Summary Error:', error);
        res.status(500).json({ message: error.message || 'Server error while fetching summary.' });
    }
});

// GET RESEARCHER ALL ANALYSES (for researcher history page)
app.get('/api/researcher/all-analyses', authenticateToken, authorizeRoles('Researcher'), async (req, res) => {
    try {
        // Researchers can see all anonymized analyses
        const analyses = await AnalysisResult.find({})
            .populate('patientId', 'dob userType') // Only get necessary fields for research
            .sort({ date: -1 });

        // Anonymize the data for research purposes
        const anonymizedAnalyses = analyses.map(analysis => ({
            _id: analysis._id,
            date: analysis.date,
            imageAnalysis: analysis.imageAnalysis,
            questionnaireAnalysis: analysis.questionnaireAnalysis,
            combinedOutcome: analysis.combinedOutcome,
            graphData: analysis.graphData,
            patientAge: analysis.patientId?.dob ? 
                new Date().getFullYear() - new Date(analysis.patientId.dob).getFullYear() : null,
            patientType: analysis.patientId?.userType,
            // Generate anonymous patient ID for research
            anonymousPatientId: `ANON-${analysis.patientId?._id.toString().substring(0, 8).toUpperCase()}`
        }));

        res.status(200).json(anonymizedAnalyses);
    } catch (error) {
        console.error('Get Researcher All Analyses Error:', error);
        res.status(500).json({ message: error.message || 'Server error while fetching analyses.' });
    }
});

// GET GRAPHOLOGIST REVIEW HISTORY
app.get('/api/graphologist/reviews/:graphologistId', authenticateToken, authorizeRoles('Graphologist'), async (req, res) => {
    try {
        const { graphologistId } = req.params;
        if (req.user.id !== graphologistId) {
            return res.status(403).json({ message: 'Unauthorized access.' });
        }
        const reviews = await HandwritingSample.find({ 
            'graphologistReview.reviewedBy': graphologistId 
        }).sort({ 'graphologistReview.reviewDate': -1 });

        res.status(200).json(reviews);
    } catch (error) {
        console.error('Get Graphologist Reviews Error:', error);
        res.status(500).json({ message: error.message || 'Server error while fetching reviews.' });
    }
});

// GET USER
app.get('/api/get-user', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        res.status(200).json({ user });
    } catch (error) {
        console.error('Get User Error:', error);
        res.status(500).json({ message: error.message || 'Server error.' });
    }
});

// START SERVER
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});