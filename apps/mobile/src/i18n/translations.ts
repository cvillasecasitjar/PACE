import type { Locale } from "@pace/shared";

type Dict = Record<string, string>;

/**
 * Lightweight i18n dictionary (es/en). Values can contain {placeholders}
 * replaced at render time. Kept dependency-free on purpose.
 */
export const TRANSLATIONS: Record<Locale, Dict> = {
  es: {
    "common.continue": "Continuar",
    "common.back": "Atrás",
    "common.skip": "Saltar",
    "common.save": "Guardar",
    "common.cancel": "Cancelar",
    "common.loading": "Cargando…",
    "common.retry": "Reintentar",
    "common.error": "Algo salió mal",

    "onboarding.welcome.title": "Sabe cuánto puedes gastar,\nen tiempo real.",
    "onboarding.welcome.subtitle":
      "Pace conecta tu banco y te dice si puedes permitirte algo ahora mismo. Sin hojas de cálculo. Sin estrés.",
    "onboarding.welcome.cta": "Empezar",
    "onboarding.welcome.login": "Ya tengo cuenta",

    "auth.register.title": "Crea tu cuenta",
    "auth.register.subtitle": "Tardas menos de un minuto.",
    "auth.login.title": "Bienvenido de nuevo",
    "auth.email": "Email",
    "auth.password": "Contraseña",
    "auth.name": "Nombre",
    "auth.register.cta": "Crear cuenta",
    "auth.login.cta": "Entrar",
    "auth.toLogin": "¿Ya tienes cuenta? Entra",
    "auth.toRegister": "¿No tienes cuenta? Regístrate",

    "bank.title": "Conecta tu banco",
    "bank.subtitle":
      "Conexión de solo lectura vía Open Banking (PSD2). Nunca vemos tus credenciales y puedes desconectar cuando quieras.",
    "bank.connect": "Conectar banco (demo)",
    "bank.secure": "Cifrado AES-256 · Acceso solo lectura · Revocable",
    "bank.connecting": "Conectando de forma segura…",

    "buffer.title": "Tu colchón de seguridad",
    "buffer.subtitle":
      "¿Cuánto quieres mantener siempre intocable? Lo restaremos al decirte qué puedes gastar.",
    "buffer.finish": "Terminar",

    "tab.home": "Inicio",
    "tab.transactions": "Movimientos",
    "tab.budgets": "Presupuestos",
    "tab.canI": "¿Puedo?",
    "tab.settings": "Ajustes",

    "dashboard.greeting": "Hola, {name}",
    "dashboard.available": "Dinero para extras este mes",
    "dashboard.canIspend": "¿Puedo gastar...?",
    "dashboard.spent7": "Gastado (7 días)",
    "dashboard.spentMonth": "Gastado (mes)",
    "dashboard.commitments": "Gastos fijos pendientes",
    "dashboard.recent": "Movimientos recientes",
    "dashboard.thisWeek": "Esta semana",
    "dashboard.balance": "Saldo actual",
    "dashboard.viewAll": "Ver todos",

    "tx.title": "Movimientos",
    "tx.search": "Buscar comercio…",
    "tx.all": "Todos",
    "tx.empty": "Sin movimientos todavía",
    "tx.changeCategory": "Cambiar categoría",
    "tx.recurring": "Recurrente",

    "budgets.title": "Presupuestos",
    "budgets.subtitle": "Tu gasto por categoría este mes",
    "budgets.add": "Añadir presupuesto",
    "budgets.suggested": "Sugeridos para ti",
    "budgets.spentOf": "{spent} de {limit}",
    "budgets.remaining": "Quedan {amount}",
    "budgets.over": "Te pasaste {amount}",
    "budgets.empty": "Aún no tienes presupuestos",

    "canI.title": "¿Me lo puedo permitir?",
    "canI.subtitle": "Escribe una cantidad y lo calculamos al instante.",
    "canI.ask": "¿Puedo permitírmelo?",
    "canI.available": "Disponible para extras",
    "canI.afterThis": "Después te quedarían",
    "decision.yes": "¡Adelante!",
    "decision.caution": "Puedes, pero justo",
    "decision.no": "Mejor espera",
    "decision.yes.msg":
      "Tienes {currency}{available} de dinero para caprichos este mes. Después te quedarían {currency}{remaining}.",
    "decision.caution.msg":
      "Puedes, pero te dejaría solo {currency}{remaining} de margen antes de tu colchón de {currency}{buffer}.",
    "decision.no.msg":
      "Esto te dejaría {currency}{remaining} por debajo de tu colchón de seguridad este mes.",

    "settings.title": "Ajustes",
    "settings.appearance": "Apariencia",
    "settings.system": "Sistema",
    "settings.light": "Claro",
    "settings.dark": "Oscuro",
    "settings.language": "Idioma",
    "settings.buffer": "Colchón de seguridad",
    "settings.accounts": "Cuentas conectadas",
    "settings.disconnect": "Desconectar",
    "settings.logout": "Cerrar sesión",
    "settings.sync": "Sincronizar ahora",
  },
  en: {
    "common.continue": "Continue",
    "common.back": "Back",
    "common.skip": "Skip",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.loading": "Loading…",
    "common.retry": "Retry",
    "common.error": "Something went wrong",

    "onboarding.welcome.title": "Know what you can spend,\nin real time.",
    "onboarding.welcome.subtitle":
      "Pace connects your bank and tells you if you can afford something right now. No spreadsheets. No stress.",
    "onboarding.welcome.cta": "Get started",
    "onboarding.welcome.login": "I already have an account",

    "auth.register.title": "Create your account",
    "auth.register.subtitle": "Takes less than a minute.",
    "auth.login.title": "Welcome back",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.name": "Name",
    "auth.register.cta": "Create account",
    "auth.login.cta": "Log in",
    "auth.toLogin": "Already have an account? Log in",
    "auth.toRegister": "No account yet? Sign up",

    "bank.title": "Connect your bank",
    "bank.subtitle":
      "Read-only connection via Open Banking (PSD2). We never see your credentials and you can disconnect anytime.",
    "bank.connect": "Connect bank (demo)",
    "bank.secure": "AES-256 encrypted · Read-only · Revocable",
    "bank.connecting": "Connecting securely…",

    "buffer.title": "Your safety buffer",
    "buffer.subtitle":
      "How much do you always want to keep untouchable? We subtract it when telling you what you can spend.",
    "buffer.finish": "Finish",

    "tab.home": "Home",
    "tab.transactions": "Transactions",
    "tab.budgets": "Budgets",
    "tab.canI": "Can I?",
    "tab.settings": "Settings",

    "dashboard.greeting": "Hi, {name}",
    "dashboard.available": "Fun money left this month",
    "dashboard.canIspend": "Can I spend...?",
    "dashboard.spent7": "Spent (7 days)",
    "dashboard.spentMonth": "Spent (month)",
    "dashboard.commitments": "Upcoming fixed costs",
    "dashboard.recent": "Recent transactions",
    "dashboard.thisWeek": "This week",
    "dashboard.balance": "Current balance",
    "dashboard.viewAll": "View all",

    "tx.title": "Transactions",
    "tx.search": "Search merchant…",
    "tx.all": "All",
    "tx.empty": "No transactions yet",
    "tx.changeCategory": "Change category",
    "tx.recurring": "Recurring",

    "budgets.title": "Budgets",
    "budgets.subtitle": "Your spending by category this month",
    "budgets.add": "Add budget",
    "budgets.suggested": "Suggested for you",
    "budgets.spentOf": "{spent} of {limit}",
    "budgets.remaining": "{amount} left",
    "budgets.over": "{amount} over",
    "budgets.empty": "No budgets yet",

    "canI.title": "Can I afford it?",
    "canI.subtitle": "Type an amount and we'll work it out instantly.",
    "canI.ask": "Can I afford it?",
    "canI.available": "Available for extras",
    "canI.afterThis": "After this you'd have",
    "decision.yes": "Go for it!",
    "decision.caution": "You can, but it's tight",
    "decision.no": "Better wait",
    "decision.yes.msg":
      "You have {currency}{available} of fun money this month. After this you'd still have {currency}{remaining}.",
    "decision.caution.msg":
      "You can, but it'd leave only {currency}{remaining} of room before your {currency}{buffer} buffer.",
    "decision.no.msg":
      "This would push you {currency}{remaining} below your safety buffer this month.",

    "settings.title": "Settings",
    "settings.appearance": "Appearance",
    "settings.system": "System",
    "settings.light": "Light",
    "settings.dark": "Dark",
    "settings.language": "Language",
    "settings.buffer": "Safety buffer",
    "settings.accounts": "Connected accounts",
    "settings.disconnect": "Disconnect",
    "settings.logout": "Log out",
    "settings.sync": "Sync now",
  },
};
