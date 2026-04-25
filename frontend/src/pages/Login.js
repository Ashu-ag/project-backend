import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, ChevronRight, GraduationCap } from 'lucide-react';

const inputStyle = {
  width: '100%',
  padding: '0.75rem 0.75rem 0.75rem 2.5rem',
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid rgba(255,255,255,0.18)',
  borderRadius: '12px',
  color: '#fff',
  fontSize: '0.95rem',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s ease',
};

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'student' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' }); // type: 'error' | 'success'
  const [showPassword, setShowPassword] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });
    try {
      const result = isLogin
        ? await login(formData.email, formData.password)
        : await register(formData);

      if (result.success) {
        setMessage({ text: isLogin ? 'Welcome back! Redirecting...' : 'Account created! Redirecting...', type: 'success' });
        setTimeout(() => navigate('/dashboard'), 800);
      } else {
        setMessage({ text: result.message || 'Something went wrong. Please try again.', type: 'error' });
      }
    } catch {
      setMessage({ text: 'An unexpected error occurred. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(prev => !prev);
    setMessage({ text: '', type: '' });
    setFormData({ name: '', email: '', password: '', role: 'student' });
    setShowPassword(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 30%, #4338ca 60%, #6366f1 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem', fontFamily: "'Inter','Segoe UI',sans-serif",
      position: 'relative', overflow: 'hidden'
    }}>
      {/* Decorative blobs */}
      <div style={{ position:'absolute', top:'-10%', right:'-5%', width:'420px', height:'420px', background:'rgba(99,102,241,0.3)', borderRadius:'50%', filter:'blur(80px)' }} />
      <div style={{ position:'absolute', bottom:'-10%', left:'-5%', width:'360px', height:'360px', background:'rgba(167,139,250,0.25)', borderRadius:'50%', filter:'blur(80px)' }} />

      <div style={{ maxWidth:'440px', width:'100%', position:'relative', zIndex:1 }}>
        {/* Glassmorphism card */}
        <div style={{
          background: 'rgba(255,255,255,0.07)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.18)',
          borderRadius: '24px', padding: '2.5rem',
          boxShadow: '0 25px 50px rgba(0,0,0,0.4)'
        }}>
          {/* Logo */}
          <div style={{ textAlign:'center', marginBottom:'2rem' }}>
            <div style={{
              display:'inline-flex', alignItems:'center', justifyContent:'center',
              width:'72px', height:'72px',
              background:'linear-gradient(135deg,#818cf8,#6366f1)',
              borderRadius:'20px', marginBottom:'1.25rem',
              boxShadow:'0 8px 24px rgba(99,102,241,0.5)'
            }}>
              <GraduationCap size={36} color="white" />
            </div>
            <h1 style={{ fontSize:'1.9rem', fontWeight:'800', color:'#fff', margin:'0 0 0.4rem' }}>
              Classroom App
            </h1>
            <p style={{ color:'rgba(255,255,255,0.65)', fontSize:'0.95rem', margin:0 }}>
              {isLogin ? 'Welcome back! Sign in to continue.' : 'Create your account to get started.'}
            </p>
          </div>

          {/* Alert message */}
          {message.text && (
            <div style={{
              padding:'0.85rem 1rem', borderRadius:'12px', marginBottom:'1.25rem',
              fontSize:'0.875rem', fontWeight:'500', display:'flex', alignItems:'center', gap:'0.5rem',
              background: message.type === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
              border: `1px solid ${message.type === 'error' ? 'rgba(239,68,68,0.4)' : 'rgba(34,197,94,0.4)'}`,
              color: message.type === 'error' ? '#fca5a5' : '#86efac'
            }}>
              {message.type === 'error' ? '⚠️' : '✅'} {message.text}
            </div>
          )}

          {/* Mode tabs */}
          <div style={{ display:'flex', background:'rgba(255,255,255,0.08)', borderRadius:'12px', padding:'4px', marginBottom:'1.75rem' }}>
            {['Sign In', 'Register'].map((label, idx) => {
              const active = (idx === 0) === isLogin;
              return (
                <button key={label} type="button"
                  onClick={() => { if ((idx === 0) !== isLogin) switchMode(); }}
                  style={{
                    flex:1, padding:'0.6rem', borderRadius:'9px', border:'none',
                    cursor:'pointer', fontWeight:'600', fontSize:'0.9rem',
                    transition:'all 0.2s ease',
                    background: active ? 'rgba(255,255,255,0.18)' : 'transparent',
                    color: active ? '#fff' : 'rgba(255,255,255,0.45)',
                    boxShadow: active ? '0 2px 8px rgba(0,0,0,0.25)' : 'none'
                  }}
                >{label}</button>
              );
            })}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            {!isLogin && (
              <>
                <div>
                  <label style={{ display:'block', color:'rgba(255,255,255,0.7)', fontSize:'0.78rem', fontWeight:'600', marginBottom:'0.4rem', letterSpacing:'0.05em' }}>FULL NAME</label>
                  <div style={{ position:'relative' }}>
                    <User size={16} style={{ position:'absolute', left:'14px', top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,0.4)' }} />
                    <input type="text" name="name" value={formData.name} onChange={handleChange}
                      placeholder="Enter your full name" required={!isLogin} style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label style={{ display:'block', color:'rgba(255,255,255,0.7)', fontSize:'0.78rem', fontWeight:'600', marginBottom:'0.4rem', letterSpacing:'0.05em' }}>ROLE</label>
                  <select name="role" value={formData.role} onChange={handleChange}
                    required={!isLogin} style={{ ...inputStyle, paddingLeft:'1rem' }}>
                    <option value="student">🎓 Student</option>
                    <option value="teacher">📚 Teacher</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label style={{ display:'block', color:'rgba(255,255,255,0.7)', fontSize:'0.78rem', fontWeight:'600', marginBottom:'0.4rem', letterSpacing:'0.05em' }}>EMAIL ADDRESS</label>
              <div style={{ position:'relative' }}>
                <Mail size={16} style={{ position:'absolute', left:'14px', top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,0.4)' }} />
                <input type="email" name="email" value={formData.email} onChange={handleChange}
                  placeholder="Enter your email" required style={inputStyle} />
              </div>
            </div>

            <div>
              <label style={{ display:'block', color:'rgba(255,255,255,0.7)', fontSize:'0.78rem', fontWeight:'600', marginBottom:'0.4rem', letterSpacing:'0.05em' }}>PASSWORD</label>
              <div style={{ position:'relative' }}>
                <Lock size={16} style={{ position:'absolute', left:'14px', top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,0.4)' }} />
                <input type={showPassword ? 'text' : 'password'} name="password"
                  value={formData.password} onChange={handleChange}
                  placeholder="Enter your password" required minLength="6"
                  style={{ ...inputStyle, paddingRight:'44px' }} />
                <button type="button" onClick={() => setShowPassword(p => !p)}
                  style={{ position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.5)', padding:'4px' }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" id="login-submit-btn" disabled={loading}
              style={{
                width:'100%', padding:'0.875rem',
                background: loading ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                border:'none', borderRadius:'12px', color:'#fff', fontWeight:'700',
                fontSize:'1rem', cursor: loading ? 'not-allowed' : 'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem',
                marginTop:'0.5rem',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(99,102,241,0.5)',
                transition:'all 0.2s ease'
              }}>
              {loading ? (
                <>
                  <div style={{ width:'18px', height:'18px', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </>
              ) : (
                <>{isLogin ? 'Sign In' : 'Create Account'}<ChevronRight size={18} /></>
              )}
            </button>
          </form>

          <p style={{ textAlign:'center', marginTop:'1.5rem', color:'rgba(255,255,255,0.5)', fontSize:'0.875rem' }}>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={switchMode} style={{ background:'none', border:'none', cursor:'pointer', color:'#a5b4fc', fontWeight:'600', fontSize:'0.875rem', textDecoration:'underline' }}>
              {isLogin ? 'Register here' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        select option { background: #312e81; color: #fff; }
      `}</style>
    </div>
  );
};

export default Login;