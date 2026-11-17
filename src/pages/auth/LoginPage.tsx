import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BrandEmblem } from '../../components/common/BrandEmblem';
import { usePharmacyStore } from '../../store/usePharmacyStore';
import { useToastStore } from '../../store/useToastStore';
import { emailSchema } from '../../utils/validation';

export function LoginPage() {
  const navigate = useNavigate();
  const staff = usePharmacyStore((s) => s.staff);
  const roles = usePharmacyStore((s) => s.roles);
  const loginDemoUser = usePharmacyStore((s) => s.loginDemoUser);
  const pushToast = useToastStore((s) => s.pushToast);

  const [email, setEmail] = useState('priya.sharma@healthyghar.in');
  const [password, setPassword] = useState('DemoOps#2026');
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [needs2FA, setNeeds2FA] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const emailCheck = emailSchema.safeParse(email);
    if (!emailCheck.success) {
      setErrorMsg(emailCheck.error.issues[0]?.message || 'Invalid email');
      return;
    }
    if (password.trim().length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    const matchedUser = staff.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!matchedUser) {
      setErrorMsg('Invalid staff credentials. Select a demo role below or check your registered Healthy Ghar email.');
      return;
    }

    if (matchedUser.twoFactorEnabled && !needs2FA) {
      setNeeds2FA(true);
      pushToast({
        type: 'info',
        title: 'Demo 2FA Verification',
        description: 'Enter any 6-digit demo OTP (e.g. 482910) to complete sign-in.',
      });
      return;
    }

    if (needs2FA && !/^\d{6}$/.test(twoFactorCode.trim())) {
      setErrorMsg('Enter a 6-digit authentication code (e.g. 482910).');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const res = loginDemoUser(email);
      setLoading(false);
      if (!res.ok) {
        setErrorMsg(res.message);
        return;
      }
      pushToast({
        type: 'success',
        title: `Welcome, ${res.data?.name}`,
        description: `Signed into Healthy Ghar Operations Core (${res.data?.roleId}) in Demo Mode.`,
      });
      navigate('/dashboard');
    }, 300);
  };

  const quickFillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('DemoOps#2026');
    setNeeds2FA(false);
    setTwoFactorCode('');
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col lg:flex-row">
      {/* Left Brand Clinical Panel */}
      <div className="lg:w-5/12 bg-primary-container text-on-primary p-5 sm:p-8 lg:p-12 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-on-primary text-primary flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-[24px]">local_pharmacy</span>
            </div>
            <div>
              <span className="font-headline-md text-headline-md tracking-tight block leading-none">Healthy Ghar</span>
              <span className="font-label-sm text-label-sm text-on-primary-container uppercase tracking-widest">
                Operations Core v2.4
              </span>
            </div>
          </div>

          <h1 className="font-headline-xl text-headline-xl mt-10 leading-tight">
            Indian Pharmacy & Healthcare Fulfillment Command
          </h1>
          <p className="font-body-lg text-body-lg text-on-primary-container/90 mt-4">
            Unified clinical governance for CDSCO Rule 65 prescription verification, FEFO batch control, multi-hub logistics, and GST invoicing.
          </p>

          <div className="mt-8 space-y-3">
            {[
              { icon: 'verified_user', text: 'Role-Based Access Control across 9 specialized staff roles' },
              { icon: 'ac_unit', text: 'Live 2–8°C Cold-Chain & FEFO Expiry Governance' },
              { icon: 'clinical_notes', text: 'Pharmacist-gated Schedule H / H1 / X Rx Sign-off' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3 bg-primary/40 rounded-xl px-4 py-3">
                <span className="material-symbols-outlined text-primary-fixed text-[20px]">{item.icon}</span>
                <span className="font-body-md text-body-md">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-on-primary/15 flex flex-wrap items-center justify-between gap-2 text-on-primary-container font-label-sm text-label-sm">
          <span>Hubs: BLR-01 • BOM-02 • HYD-01</span>
          <span className="px-2.5 py-1 rounded-full bg-on-primary/15 text-on-primary whitespace-nowrap">DEMO MODE PERSISTENT</span>
        </div>
      </div>

      {/* Right Login Card */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-12">
        <div className="w-full max-w-lg bg-surface-container-lowest rounded-2xl shadow-sm p-5 sm:p-8 border border-outline-variant/30">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5 min-w-0">
              <BrandEmblem />
              <div className="min-w-0">
                <h2 className="font-headline-md text-headline-md text-on-surface">Staff Operations Sign In</h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Local demonstration session — no production credentials required
                </p>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-error-container text-on-error-container flex items-start gap-2.5">
              <span className="material-symbols-outlined text-[18px] mt-0.5">error</span>
              <span className="font-body-sm text-body-sm">{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-1">Work Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@healthyghar.in"
                className="w-full h-11 px-3.5 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface font-body-md focus:outline-none focus:border-primary-container"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-label-md text-label-md text-on-surface">Password</label>
                <Link to="/forgot-password" className="font-label-md text-label-md text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter staff password"
                  className="w-full h-11 pl-3.5 pr-11 rounded-lg bg-surface-container-low border border-outline-variant text-on-surface font-body-md focus:outline-none focus:border-primary-container"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-outline hover:text-on-surface"
                  aria-label="Toggle password visibility"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {needs2FA && (
              <div className="p-3.5 rounded-xl bg-surface-container-low border border-primary/20">
                <label className="block font-label-md text-label-md text-primary mb-1">
                  2FA Authenticator Code (Demo OTP)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  placeholder="Enter any 6 digits (e.g. 482910)"
                  className="w-full h-10 px-3 rounded-lg bg-surface-container-lowest border border-outline-variant font-mono text-on-surface focus:outline-none focus:border-primary-container"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-primary-container text-on-primary font-title-md text-title-md hover:bg-primary transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <span>Authenticating Demo Session...</span>
              ) : (
                <>
                  <span>{needs2FA ? 'Verify 2FA & Enter Ops Desk' : 'Sign In to Healthy Ghar Ops'}</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          {/* Demo Role Switcher Quick-Fill */}
          <div className="mt-6 pt-5 border-t border-outline-variant/40">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                Quick-Fill Demo Staff Accounts (9 Roles)
              </span>
              <span className="font-label-sm text-label-sm text-primary">Click to populate</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
              {staff.slice(0, 10).map((member) => {
                const role = roles.find((r) => r.id === member.roleId);
                const selected = email.toLowerCase() === member.email.toLowerCase();
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => quickFillDemo(member.email)}
                    className={`text-left p-2.5 rounded-lg border transition-colors ${
                      selected
                        ? 'bg-primary-fixed/40 border-primary-container'
                        : 'bg-surface-container-low border-transparent hover:bg-surface-container'
                    }`}
                  >
                    <div className="font-title-md text-body-sm text-on-surface truncate">{member.name}</div>
                    <div className="flex items-center justify-between gap-1 mt-0.5">
                      <span className="font-label-sm text-[10px] text-primary truncate">{role?.name || member.roleId}</span>
                      <span className="font-mono text-[10px] text-outline truncate">{member.hubId.replace('WH-', '')}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
