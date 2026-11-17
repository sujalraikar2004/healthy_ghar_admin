import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BrandEmblem } from '../../components/common/BrandEmblem';
import { useToastStore } from '../../store/useToastStore';
import { emailSchema } from '../../utils/validation';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const pushToast = useToastStore((s) => s.pushToast);

  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const check = emailSchema.safeParse(email);
    if (!check.success) {
      setError(check.error.issues[0]?.message || 'Invalid email');
      return;
    }
    pushToast({
      type: 'info',
      title: 'Demo Reset Code Generated',
      description: 'In Demo Mode, no real email is sent. Use sample verification code 654321.',
    });
    setStep('reset');
  };

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (otp.trim().length < 4) {
      setError('Enter the verification code (e.g. 654321).');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    pushToast({
      type: 'success',
      title: 'Demo Password Reset Completed',
      description: 'You may now sign in with your updated demo credentials.',
    });
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-sm p-5 sm:p-8 border border-outline-variant/30">
        <div className="flex items-center gap-3 mb-6">
          <BrandEmblem />
          <div className="min-w-0">
            <h1 className="font-headline-md text-headline-md text-on-surface">
              {step === 'request' ? 'Reset Staff Password' : 'Create New Password'}
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Healthy Ghar Operations Identity Recovery (Demo Mode)
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-error-container text-on-error-container font-body-sm">
            {error}
          </div>
        )}

        {step === 'request' ? (
          <form onSubmit={handleRequest} className="space-y-4">
            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-1">Registered Staff Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="priya.sharma@healthyghar.in"
                className="w-full h-11 px-3.5 rounded-lg bg-surface-container-low border border-outline-variant font-body-md text-on-surface focus:outline-none focus:border-primary-container"
              />
            </div>
            <button
              type="submit"
              className="w-full h-11 rounded-xl bg-primary-container text-on-primary font-title-md hover:bg-primary transition-colors"
            >
              Send Verification Code (Simulated)
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-1">Verification Code</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="654321"
                className="w-full h-11 px-3.5 rounded-lg bg-surface-container-low border border-outline-variant font-mono text-on-surface focus:outline-none focus:border-primary-container"
              />
            </div>
            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full h-11 px-3.5 rounded-lg bg-surface-container-low border border-outline-variant font-body-md text-on-surface focus:outline-none focus:border-primary-container"
              />
            </div>
            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full h-11 px-3.5 rounded-lg bg-surface-container-low border border-outline-variant font-body-md text-on-surface focus:outline-none focus:border-primary-container"
              />
            </div>
            <button
              type="submit"
              className="w-full h-11 rounded-xl bg-primary-container text-on-primary font-title-md hover:bg-primary transition-colors"
            >
              Update Password
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link to="/login" className="font-title-md text-body-sm text-primary hover:underline">
            ← Back to Staff Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
