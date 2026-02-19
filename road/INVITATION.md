┌────────────────────────────────────────────────────────────┐
│  FLOW D'INVITATION                                         │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  1. Admin génère un lien d'invitation                      │
│     → POST /invitations                                    │
│     → Payload: { role, projectIds?, expiresInDays }        │
│                                                            │
│  2. Backend crée un token JWT signé                        │
│     → Contient: role, projects, orgId, invitedBy, exp      │
│     → Stocké en DB (pour révocation possible)              │
│                                                            │
│  3. Lien généré:                                           │
│     → https://impacttrack.io/join?token=abc123             │
│                                                            │
│  4. Admin partage le lien (WhatsApp, email, Slack...)      │
│                                                            │
│  5. Destinataire clique → Page /join                       │
│     → Vérifie token valide + non utilisé                   │
│     → Formulaire: prénom, nom, email, mot de passe         │
│                                                            │
│  6. Compte créé avec permissions pré-configurées           │
│     → Token marqué comme "used"                            │
│     → Redirection dashboard                                │
│                                                            │
└────────────────────────────────────────────────────────────┘