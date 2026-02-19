┌─────────────────────────────────────────────────────────────┐
│  PERMISSION MATRIX (exemple réel)                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  USER: Marie (Manager)                                      │
│  ├── Organization: ONG Espoir                               │
│  ├── Role: manager                                          │
│  ├── Global Permissions: [create_project, invite_agent]     │
│  └── Project Access:                                        │
│      ├── Projet A (Insertion): [read, write, manage]        │
│      ├── Projet B (Santé): [read, write]                    │
│      └── Projet C (Éducation): [read] (observateur)         │
│                                                             │
│  USER: Jean (Agent)                                         │
│  ├── Organization: ONG Espoir                               │
│  ├── Role: agent                                            │
│  └── Project Access:                                        │
│      └── Projet A (Insertion): [read, write_indicator]      │
│                                                             │
│  USER: Consultant (Observer)                                │
│  ├── Organization: ONG Espoir                               │
│  ├── Role: observer                                         │
│  └── Project Access:                                        │
│      ├── Projet A: [read]                                   │
│      └── Projet B: [read]                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘