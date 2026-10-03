import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { useAuthDialog } from '../authDialog.jsx';

export default function Login() {
  const { user, ready } = useAuth();
  const { openAuth } = useAuthDialog();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next') || '/profile';

  useEffect(() => {
    if (!ready) return;
    if (user) {
      navigate(next, { replace: true });
    } else {
      openAuth({
        initialTab: 'signin',
        next,
        onSuccess: () => navigate(next, { replace: true }),
      });
    }
  }, [user, ready, navigate, next, openAuth]);

  return (
    <div className="container" style={{ padding: '80px 0', textAlign: 'center' }}>
      <p className="text-muted">Opening sign-in…</p>
    </div>
  );
}
