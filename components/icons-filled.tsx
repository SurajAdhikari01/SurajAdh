// Custom filled icon variants for sidebar active states

export function HouseFill({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.71 2.29a1 1 0 0 0-1.42 0l-9 9a1 1 0 0 0 1.42 1.42L4 12.41V21a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1v-5h2v5a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1v-8.59l.29.29a1 1 0 0 0 1.42-1.42l-9-9z"/>
    </svg>
  )
}

export function UserFill({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="8" r="4"/>
      <path d="M20 21a8 8 0 1 0-16 0"/>
    </svg>
  )
}

export function BriefcaseFill({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 7h-4V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM10 5h4v2h-4V5z"/>
    </svg>
  )
}

export function FlaskFill({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 3v6.5l-4.6 7.7A2 2 0 0 0 6.1 21h11.8a2 2 0 0 0 1.7-3.8L15 9.5V3H9z"/>
      <path fill="none" stroke="currentColor" strokeWidth="2" d="M9 3h6"/>
    </svg>
  )
}

export function MailFill({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22 6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6zm-2 0-8 5-8-5h16zm0 12H4V8l8 5 8-5v10z"/>
      <path d="M4 6l8 5 8-5"/>
    </svg>
  )
}
