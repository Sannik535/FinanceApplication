import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signIn } from "aws-amplify/auth";
import {
  ArrowRight,
  ChartNoAxesColumnIncreasing,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Target,
} from "lucide-react";
import "../App.css";

export default function SignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsError(false);
    setIsLoading(true);

    try {
      const result = await signIn({
        username: email.trim(),
        password,
        options: {
          authFlowType: "USER_SRP_AUTH",
        },
      });

      if (result.isSignedIn) {
        navigate("/Dashboard");
      } else {
        setMessage(
          "Cognito requires another verification step to finish signing in. Check your user pool’s MFA and sign-in settings."
        );
      }
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error ? error.message : "Sign-in failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="brand-panel">
        <Link to="/" className="brand-logo" aria-label="SpendWise home">
          <ChartNoAxesColumnIncreasing size={34} strokeWidth={2.5} />
          <span>
            Spend<span className="brand-accent">Wise</span>
          </span>
        </Link>

        <div className="brand-content">
          <p className="eyebrow">YOUR MONEY, YOUR FUTURE</p>
          <h1>
            Take control of
            <br />
            <span className="brand-accent">your finances.</span>
          </h1>
          <p className="brand-description">
            Track your income, manage your expenses, and build a better
            financial future — all in one place.
          </p>

          <div className="benefits">
            <div className="benefit">
              <span className="benefit-icon">
                <ChartNoAxesColumnIncreasing size={23} />
              </span>
              <div>
                <h3>Track your money</h3>
                <p>Know where every rupee goes.</p>
              </div>
            </div>
            <div className="benefit">
              <span className="benefit-icon">
                <ShieldCheck size={23} />
              </span>
              <div>
                <h3>Stay in control</h3>
                <p>Keep your financial goals in sight.</p>
              </div>
            </div>
            <div className="benefit">
              <span className="benefit-icon">
                <Target size={23} />
              </span>
              <div>
                <h3>Build better habits</h3>
                <p>Make smarter spending decisions.</p>
              </div>
            </div>
          </div>
        </div>

        <p className="brand-footer">
          Small steps today. Better finances tomorrow.
        </p>
      </section>

      <section className="form-panel">
        <div className="login-card">
          <div className="mobile-logo">
            <ChartNoAxesColumnIncreasing size={30} />
            <span>
              Spend<span className="text-accent">Wise</span>
            </span>
          </div>

          <div className="login-heading">
            <h2>Welcome back</h2>
            <p>Sign in to your SpendWise account</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email address</label>
              <div className="input-wrapper">
                <Mail size={19} aria-hidden="true" />
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setMessage("");
                  }}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <LockKeyhole size={19} aria-hidden="true" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setMessage("");
                  }}
                  autoComplete="current-password"
                  required
                />
                <button
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowPassword((shown) => !shown)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>

            <div className="form-options">
              <label className="remember-option">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                />
                <span>Remember me</span>
              </label>

              <button
                type="button"
                className="text-link"
                onClick={() =>
                  setMessage(
                    "Password reset is not wired yet. Use the Cognito reset flow or ask me to add it."
                  )
                }
              >
                Forgot password?
              </button>
            </div>

            <button
              className="submit-button"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? "Signing in…" : "Sign in"}
              {!isLoading && <ArrowRight size={19} />}
            </button>

            {message && (
              <p
                className={`form-message${isError ? " error" : ""}`}
                role={isError ? "alert" : "status"}
              >
                {message}
              </p>
            )}
          </form>

          <div className="divider">
            <span />
            <p>or</p>
            <span />
          </div>

          <button
            className="google-button"
            type="button"
            onClick={() =>
              setMessage(
                "Google sign-in needs Google to be configured as an identity provider in your Cognito user pool."
              )
            }
          >
            <span className="google-g">G</span>
            Continue with Google
          </button>

          <p className="signup-prompt">
            Don&apos;t have an account?{" "}
            <Link to="/signup" className="text-link">
              Sign up
            </Link>
          </p>

          <p className="security-note">
            <ShieldCheck size={15} />
            Your financial journey starts here.
          </p>
        </div>
      </section>
    </main>
  );
}