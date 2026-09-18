import { redirect } from 'next/navigation';

export default function RootPage() {
  // Redirige al usuario a la vista de login de forma automática
  redirect('/login');
}