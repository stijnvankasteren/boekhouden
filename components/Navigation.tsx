import Link from 'next/link'

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/instellingen', label: 'Instellingen' },
  { href: '/relaties', label: 'Relaties' },
  { href: '/transacties', label: 'Transacties' },
  { href: '/winst-verlies', label: 'Winst & Verlies' },
  { href: '/btw-rapport', label: 'BTW Rapport' },
]

export default function Navigation() {
  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}
