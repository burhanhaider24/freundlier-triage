import { redirect } from 'next/navigation'

export default function Home() {
  // Automatically send anyone who visits the root domain straight to the login page
  redirect('/login')
}