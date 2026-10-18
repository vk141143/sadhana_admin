import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';

interface AuthViewProps {
  onLoginSuccess: (user: {
    name: string;
    email: string;
    role: string;
  }) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  onLoginSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');

  const [loading, setLoading] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // ============================================================
  // LOGIN
  // ============================================================

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setErrorMsg('Please enter email and password.');
      return;
    }

    try {
      setLoading(true);

      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({ email: normalizedEmail, password });

      if (authError) {
        if (authError.message.toLowerCase().includes('email not confirmed')) {
          setErrorMsg('Please confirm your email first, then try logging in.');
        } else if (authError.message.toLowerCase().includes('invalid login')) {
          setErrorMsg('Incorrect email or password.');
        } else {
          setErrorMsg(authError.message);
        }
        return;
      }

      if (!authData.user) {
        setErrorMsg('Login failed. Please try again.');
        return;
      }

      const { data: admin, error: adminError } = await supabase
        .from('admin_users')
        .select('full_name, email, role, is_active')
        .eq('id', authData.user.id)
        .maybeSingle();

      // Fallback: look up by email in case the row was inserted with a mismatched id
      const { data: adminByEmail } = (!admin && !adminError)
        ? await supabase.from('admin_users').select('full_name, email, role, is_active').eq('email', normalizedEmail).maybeSingle()
        : { data: null };

      const profile = admin || adminByEmail;

      if (!profile) {
        await supabase.auth.signOut();
        setErrorMsg('No admin profile found. Please register first.');
        return;
      }

      onLoginSuccess({
        name: profile.full_name,
        email: profile.email,
        role: profile.role,
      });

    } catch (err) {
      setErrorMsg('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // REGISTER
  // ============================================================

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = fullName.trim();
    const normalizedMobile = mobile.trim();

    if (!normalizedName || !normalizedEmail || !password) {
      setErrorMsg('Please fill all required fields.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    try {
      setLoading(true);

      // Step 1: Sign up with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: { data: { full_name: normalizedName, mobile: normalizedMobile } },
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      if (!data.user) {
        setErrorMsg('Registration failed. Please try again.');
        return;
      }

      // Step 2: Insert admin_users row
      const { error: insertError } = await supabase
        .from('admin_users')
        .insert({
          id: data.user.id,
          full_name: normalizedName,
          email: normalizedEmail,
          mobile: normalizedMobile,
          role: 'super_admin',
          password_hash: '',
          is_active: true,
        });

      if (insertError) {
        console.error('admin_users insert error:', insertError);
        // Row may already exist — that's fine, continue
      }

      // Step 3: Sign in immediately
      const { data: loginData, error: loginError } =
        await supabase.auth.signInWithPassword({ email: normalizedEmail, password });

      if (loginError || !loginData.user) {
        // Auth created but email confirmation may be required
        setSuccessMsg('Account created! Please check your email to confirm, then log in.');
        setMode('login');
        setEmail(normalizedEmail);
        setPassword('');
        setFullName('');
        setMobile('');
        return;
      }

      // Step 4: Go straight to dashboard
      onLoginSuccess({
        name: normalizedName,
        email: normalizedEmail,
        role: 'super_admin',
      });

    } catch (err) {
      setErrorMsg('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // SWITCH MODE
  // ============================================================

  const switchToLogin = () => {
    setMode('login');
    setErrorMsg('');
    setSuccessMsg('');
  };

  const switchToRegister = () => {
    setMode('register');
    setErrorMsg('');
    setSuccessMsg('');
  };

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="
      min-h-screen
      bg-[#0b1220]
      flex
      items-center
      justify-center
      p-4
      relative
      overflow-hidden
      text-[#dce2f6]
    ">

      {/* Background glow */}

      <div className="
        absolute
        top-1/4
        left-1/4
        w-96
        h-96
        bg-[#f2ca50]/10
        rounded-full
        blur-3xl
        pointer-events-none
        animate-pulse
      " />

      <div className="
        absolute
        bottom-1/4
        right-1/4
        w-96
        h-96
        bg-[#8b5cf6]/10
        rounded-full
        blur-3xl
        pointer-events-none
      " />

      {/* Main Card */}

      <div className="
        w-full
        max-w-md
        bg-[#19202e]
        border-2
        border-[#f2ca50]/30
        rounded-3xl
        p-8
        shadow-[0_0_50px_rgba(242,202,80,0.15)]
        z-10
        relative
      ">

        {/* ================================================== */}
        {/* BRANDING */}
        {/* ================================================== */}

        <div className="text-center mb-8">

          <div className="
            w-16
            h-16
            rounded-2xl
            bg-[#f2ca50]
            mx-auto
            flex
            items-center
            justify-center
            shadow-xl
            mb-3
          ">
            <span
              className="
                material-symbols-outlined
                text-[#3c2f00]
                font-bold
                text-4xl
              "
              style={{
                fontVariationSettings:
                  "'FILL' 1",
              }}
            >
              temple_hindu
            </span>
          </div>

          <h1 className="
            font-serif-headline
            text-3xl
            font-bold
            text-[#f2ca50]
          ">
            Sadhana Admin
          </h1>

          <p className="
            text-xs
            text-[#d0c5af]/70
            mt-1
            font-sans
            uppercase
            tracking-[0.2em]
          ">
            Vedic Sacred CMS Portal
          </p>

        </div>

        {/* ================================================== */}
        {/* LOGIN / REGISTER TABS */}
        {/* ================================================== */}

        <div className="
          flex
          bg-[#0c1321]
          p-1
          rounded-2xl
          border
          border-white/10
          mb-6
          text-xs
          font-semibold
        ">

          <button
            type="button"
            onClick={switchToLogin}
            className={`
              flex-1
              py-2
              rounded-xl
              transition-all
              ${
                mode === 'login'
                  ? 'bg-[#f2ca50] text-[#3c2f00] font-bold shadow'
                  : 'text-[#d0c5af] hover:text-white'
              }
            `}
          >
            Sign In
          </button>

          <button
            type="button"
            onClick={switchToRegister}
            className={`
              flex-1
              py-2
              rounded-xl
              transition-all
              ${
                mode === 'register'
                  ? 'bg-[#f2ca50] text-[#3c2f00] font-bold shadow'
                  : 'text-[#d0c5af] hover:text-white'
              }
            `}
          >
            Register
          </button>

        </div>

        {/* ================================================== */}
        {/* ERROR */}
        {/* ================================================== */}

        {errorMsg && (
          <div className="
            mb-4
            p-3
            bg-rose-500/10
            border
            border-rose-500/30
            rounded-xl
            text-xs
            text-rose-300
            flex
            items-start
            gap-2
          ">

            <span className="
              material-symbols-outlined
              text-base
              shrink-0
            ">
              error
            </span>

            <span>
              {errorMsg}
            </span>

          </div>
        )}

        {/* ================================================== */}
        {/* SUCCESS */}
        {/* ================================================== */}

        {successMsg && (
          <div className="
            mb-4
            p-3
            bg-emerald-500/10
            border
            border-emerald-500/30
            rounded-xl
            text-xs
            text-emerald-300
            flex
            items-start
            gap-2
          ">

            <span className="
              material-symbols-outlined
              text-base
              shrink-0
            ">
              check_circle
            </span>

            <span>
              {successMsg}
            </span>

          </div>
        )}

        {/* ================================================== */}
        {/* FORM */}
        {/* ================================================== */}

        <form
          onSubmit={
            mode === 'login'
              ? handleLogin
              : handleRegister
          }
          className="space-y-4"
        >

          {/* REGISTER ONLY */}

          {mode === 'register' && (
            <>
              {/* FULL NAME */}

              <div>

                <label className="
                  text-xs
                  font-semibold
                  text-[#f2ca50]
                  block
                  mb-1
                ">
                  Full Name *
                </label>

                <input
                  type="text"
                  value={fullName}
                  onChange={(e) =>
                    setFullName(e.target.value)
                  }
                  placeholder="Arjun Varma"
                  autoComplete="name"
                  className="
                    w-full
                    bg-[#0c1321]
                    border
                    border-white/10
                    rounded-xl
                    py-2.5
                    px-3.5
                    text-xs
                    text-[#dce2f6]
                    placeholder-[#d0c5af]/30
                    focus:ring-1
                    focus:ring-[#f2ca50]
                    outline-none
                  "
                />

              </div>

              {/* MOBILE */}

              <div>

                <label className="
                  text-xs
                  font-semibold
                  text-[#f2ca50]
                  block
                  mb-1
                ">
                  Mobile
                </label>

                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) =>
                    setMobile(e.target.value)
                  }
                  placeholder="+91 9876543210"
                  autoComplete="tel"
                  className="
                    w-full
                    bg-[#0c1321]
                    border
                    border-white/10
                    rounded-xl
                    py-2.5
                    px-3.5
                    text-xs
                    text-[#dce2f6]
                    placeholder-[#d0c5af]/30
                    focus:ring-1
                    focus:ring-[#f2ca50]
                    outline-none
                  "
                />

              </div>
            </>
          )}

          {/* EMAIL */}

          <div>

            <label className="
              text-xs
              font-semibold
              text-[#f2ca50]
              block
              mb-1
            ">
              Email *
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              placeholder="admin@sadhana.app"
              autoComplete="email"
              className="
                w-full
                bg-[#0c1321]
                border
                border-white/10
                rounded-xl
                py-2.5
                px-3.5
                text-xs
                text-[#dce2f6]
                placeholder-[#d0c5af]/30
                focus:ring-1
                focus:ring-[#f2ca50]
                outline-none
              "
            />

          </div>

          {/* PASSWORD */}

          <div>

            <label className="
              text-xs
              font-semibold
              text-[#f2ca50]
              block
              mb-1
            ">
              Password *
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder="••••••••"
              autoComplete={
                mode === 'login'
                  ? 'current-password'
                  : 'new-password'
              }
              className="
                w-full
                bg-[#0c1321]
                border
                border-white/10
                rounded-xl
                py-2.5
                px-3.5
                text-xs
                text-[#dce2f6]
                placeholder-[#d0c5af]/30
                focus:ring-1
                focus:ring-[#f2ca50]
                outline-none
              "
            />

          </div>

          {/* SUBMIT */}

          <button
            type="submit"
            disabled={loading}
            className="
              w-full
              py-3
              bg-[#f2ca50]
              text-[#3c2f00]
              font-bold
              text-xs
              rounded-xl
              hover:bg-[#ffe082]
              transition-all
              shadow-lg
              flex
              items-center
              justify-center
              gap-2
              mt-2
              disabled:opacity-60
              disabled:cursor-not-allowed
            "
          >

            {loading ? (
              <span className="
                material-symbols-outlined
                text-base
                animate-spin
              ">
                progress_activity
              </span>
            ) : (
              <span className="
                material-symbols-outlined
                text-base
                font-bold
              ">
                {
                  mode === 'login'
                    ? 'login'
                    : 'person_add'
                }
              </span>
            )}

            {
              loading
                ? 'Please wait...'
                : mode === 'login'
                  ? 'Enter Sacred CMS'
                  : 'Create Admin Account'
            }

          </button>

        </form>

      </div>

    </div>
  );
};