┌─────────────────────────────────────────────────────────────┐
│  MATRICE DES PERMISSIONS                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ORG_ADMIN (créateur org)                                   │
│  ├── Tous les projets: read, write, manage, admin           │
│  ├── Inviter: admin, manager, agent, observer               │
│  ├── Voir audit logs                                        │
│  ├── Gérer membres (révoquer, changer rôle)                 │
│  └── Supprimer organisation                                 │
│                                                             │
│  MANAGER (invité par admin)                                 │
│  ├── Projets assignés: read, write, manage                  │
│  ├── Inviter: agent sur SES projets                         │
│  ├── Créer indicateurs sur SES projets                      │
│  └── Voir équipe projet                                     │
│                                                             │
│  AGENT (invité par admin/manager)                           │
│  ├── Projets assignés: read, write (indicateurs uniquement) │
│  ├── Saisir valeurs                                         │
│  └── Voir ses indicateurs assignés                          │
│                                                             │
│  OBSERVER (invité par admin)                                │
│  ├── TOUS les projets org: read                             │
│  ├── Voir dashboards, rapports                              │
│  └── Pas de modification possible                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘