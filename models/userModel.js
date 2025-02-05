const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A User must have Name'],
    trim: true,
    maxlength: [40, 'User Name excceeds Character limit'],
    minlength: [3, 'User Name should have greater than 2  characters'],
  },

  email: {
    type: String,
    required: [true, 'User must have an email '],
    trim: true,
    lowercase: true,
    unique: true,
    validate: [validator.isEmail, 'Please provide a valid email'],
  },
  companySize:{
    type: Number,
    required: [true, 'Please Provide the size again'],
  },
  password: {
    type: String,
    required: [true, 'Please Provide the password again'],
    minlength: 8,
    select: false,
  },
  phone:{
    type:String,
    required: [true, 'Please Provide the Phone again'],
    minlength: 5,
  },
  confirmpassword: {
    type: String,
    required: [true, 'Please Provide the password again'],
    validate: {
      validator: function (el) {
        return el === this.password;
      },
      message: 'Entered Passwords are not the same',
    },
  },
  
  passwordChangedAt: Date,
 
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
  interviews: {
    type: mongoose.Schema.ObjectId,
    ref: 'Interview',
    
  }


},{
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});


userSchema.pre(/^find/, function(next) {
 

  this.populate({
    path: 'interviews',
    select: 'title description experience endDate candidates'
  });
  next();
});

userSchema.pre(/^find/, function (next) {
  this.find({ active: { $ne: false } });
  next();
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 12);
  this.confirmpassword = undefined;
  next();
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    //
    // console.log(changedTimestamp, JWTTimestamp);
    return JWTTimestamp < changedTimestamp;
  }

  // False means NOT changed
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  console.log('Rest Token', resetToken, this.passwordResetToken);

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  console.log('Expires time ', this.passwordResetExpires);

  return resetToken;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
