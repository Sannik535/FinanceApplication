import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { confirmSignUp, resendSignUpCode, signUp } from "aws-amplify/auth";
import {
  ArrowRight,
  ChartNoAxesColumnIncreasing,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  UserRound,
} from "lucide-react";
import "../App.css";

export default function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsError(false);

    if (password !== confirmPassword) {
      setIsError(true);
      setMessage("Passwords do not match.");
      return;
    }

    if (!acceptTerms) {
      setIsError(true);
      setMessage("Please accept the terms to continue.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await signUp({
        username: email.trim(),
        password,
        options: {
          userAttributes: {
            email: email.trim(),
            name: name.trim(),
          },
        },
      });

      if (result.nextStep.signUpStep === "CONFIRM_SIGN_UP") {
        setNeedsConfirmation(true);
        setMessage("We sent a confirmation code to your email.");
      } else if (result.isSignUpComplete) {
        setMessage("Your account is ready. Please sign in.");
        navigate("/");
      } else {
        setMessage("Continue with the next account setup step.");
      }
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error ? error.message : "Could not create your account."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsError(false);
    setIsLoading(true);

    try {
      const result = await confirmSignUp({
        username: email.trim(),
        confirmationCode: confirmationCode.trim(),
      });

      if (result.isSignUpComplete) {
        setMessage("Email confirmed. You can now sign in.");
        navigate("/");
      } else {
        setMessage("Your account needs another confirmation step.");
      }
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error ? error.message : "Confirmation failed."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResendCode() {
    setMessage("");
    setIsError(false);

    try {
      await resendSignUpCode({ username: email.trim() });
      setMessage("A new confirmation code was sent to your email.");
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error ? error.message : "Could not resend the code."
      );
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
          <p className="eyebrow">START YOUR JOURNEY</p>
          <h1>
            Make your money
            <br />
            <span className="brand-accent">work for you.</span>
          </h1>
          <p className="brand-description">
            Take the first step toward better financial habits. Understand your
            spending, track your income, and plan a stronger financial future.
          </p>

          <div className="benefits">
            <div className="benefit">
              <span className="benefit-icon">
                <ChartNoAxesColumnIncreasing size={23} />
              </span>
              <div>
                <h3>All your finances in one place</h3>
                <p>See your income and expenses clearly.</p>
              </div>
            </div>
            <div className="benefit">
              <span className="benefit-icon">
                <LockKeyhole size={23} />
              </span>
              <div>
                <h3>Designed with privacy in mind</h3>
                <p>Build healthier financial habits confidently.</p>
              </div>
            </div>
          </div>
        </div>

        <p className="brand-footer">
          A better relationship with money starts here.
        </p>
      </section>

      <section className="form-panel">
        <div className="login-card signup-card">
          <div className="mobile-logo">
            <ChartNoAxesColumnIncreasing size={30} />
            <span>
              Spend<span className="text-accent">Wise</span>
            </span>
          </div>

          <div className="login-heading">
            <h2>{needsConfirmation ? "Verify your email" : "Create your account"}</h2>
            <p>
              {needsConfirmation
                ? `Enter the confirmation code sent to ${email}`
                : "Join SpendWise and take control of your money"}
            </p>
          </div>

          {needsConfirmation ? (
            <form className="signup-form" onSubmit={handleConfirm}>
              <div className="form-group">
                <label htmlFor="confirmation-code">Email confirmation code</label>
                <div className="input-wrapper">
                  <Mail size={19} aria-hidden="true" />
                  <input
                    id="confirmation-code"
                    type="text"
                    value={confirmationCode}
                    onChange={(event) => {
                      setConfirmationCode(event.target.value);
                      setMessage("");
                    }}
                    autoComplete="one-time-code"
                    required
                  />
                </div>
              </div>

              <button className="submit-button" type="submit" disabled={isLoading}>
                {isLoading ? "Verifying…" : "Verify email"}
                {!isLoading && <ArrowRight size={19} />}
              </button>

              <button
                className="text-link"
                type="button"
                onClick={() => void handleResendCode()}
              >
                Resend code
              </button>
            </form>
          ) : (
            <form className="signup-form" onSubmit={handleSignup}>
              <div className="form-group">
                <label htmlFor="full-name">Full name</label>
                <div className="input-wrapper">
                  <UserRound size={19} aria-hidden="true" />
                  <input
                    id="full-name"
                    type="text"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value);
                      setMessage("");
                    }}
                    autoComplete="name"
                    maxLength={100}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="signup-email">Email address</label>
                <div className="input-wrapper">
                  <Mail size={19} aria-hidden="true" />
                  <input
                    id="signup-email"
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
                <label htmlFor="signup-password">Password</label>
                <div className="input-wrapper">
                  <LockKeyhole size={19} aria-hidden="true" />
                  <input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter a password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setMessage("");
                    }}
                    autoComplete="new-password"
                    minLength={8}
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

              <div className="form-group">
                <label htmlFor="confirm-password">Confirm password</label>
                <div className="input-wrapper">
                  <LockKeyhole size={19} aria-hidden="true" />
                  <input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password again"
                    value={confirmPassword}
                    onChange={(event) => {
                      setConfirmPassword(event.target.value);
                      setMessage("");
                    }}
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </div>
              </div>

              <label className="terms-option">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(event) => {
                    setAcceptTerms(event.target.checked);
                    setMessage("");
                  }}
                />
                <span>I agree to the terms of service and privacy policy.</span>
              </label>

              <button className="submit-button" type="submit" disabled={isLoading}>
                {isLoading ? "Creating account…" : "Create account"}
                {!isLoading && <ArrowRight size={19} />}
              </button>
            </form>
          )}

          {message && (
            <p
              className={`form-message${isError ? " error" : ""}`}
              role={isError ? "alert" : "status"}
            >
              {message}
            </p>
          )}

          <p className="signup-prompt">
            Already have an account?{" "}
            <Link to="/" className="text-link">
              Sign in
            </Link>
          </p>

          <p className="security-note">
            <LockKeyhole size={15} />
            Your financial journey starts here.
          </p>
        </div>
      </section>
    </main>
  );
}