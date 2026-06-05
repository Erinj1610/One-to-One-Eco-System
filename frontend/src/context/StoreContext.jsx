import React, { createContext, useContext, useState } from 'react';

const StoreContext = createContext();

const initialContacts = [
  { 
    id: 1, 
    name: 'Sarah Venter', 
    company: 'Venter Architects', 
    type: 'Architect', 
    email: 'sarah@venterarch.co.za', 
    phone: '082 456 7890', 
    projects: 5, 
    status: 'Active',
    lastProjectDate: '2026-04-10',
    lastContactDate: '2026-05-12',
    lastContactSummary: 'Call with JV regarding Kalahari snags',
    statedGoal: 'wants to expand architecture portfolio in Western Cape by 2027',
    annualRevenue: 350000,
    lifetimeRevenue: 1890000,
    orderGapMonths: 4,
    nps: 9,
    dateStarted: '2024-01-15',
    avgPaymentDelayDays: 4
  },
  { 
    id: 2, 
    name: 'James Motloung', 
    company: 'DM Properties', 
    type: 'Developer', 
    email: 'james@dmprop.co.za', 
    phone: '071 234 5678', 
    projects: 4, 
    status: 'Active',
    lastProjectDate: '2025-10-12',
    lastContactDate: '2025-10-15',
    lastContactSummary: 'Signed closure of Sandton retail',
    statedGoal: 'wants to launch a residential development estate by 2027',
    annualRevenue: 0,
    lifetimeRevenue: 1002268,
    orderGapMonths: 6,
    nps: 8,
    dateStarted: '2023-08-10',
    avgPaymentDelayDays: 14
  },
  { 
    id: 3, 
    name: 'Liezel du Toit', 
    company: 'LdT Interiors', 
    type: 'Interior', 
    email: 'liezel@ldt.co.za', 
    phone: '083 876 5432', 
    projects: 2, 
    status: 'Active',
    lastProjectDate: '2026-03-12',
    lastContactDate: '2026-04-01',
    lastContactSummary: 'Email follow up on fee calculation',
    statedGoal: 'wants to complete renovation of three holiday homes by 2027',
    annualRevenue: 180000,
    lifetimeRevenue: 618190,
    orderGapMonths: 12,
    nps: 9,
    dateStarted: '2024-03-12',
    avgPaymentDelayDays: 2
  },
  { 
    id: 4, 
    name: 'Marco Esteves', 
    company: 'Esteves Design', 
    type: 'Architect', 
    email: 'marco@esteves.co.za', 
    phone: '072 654 3210', 
    projects: 1, 
    status: 'Inactive',
    lastProjectDate: '2023-11-22',
    lastContactDate: '2024-05-10',
    lastContactSummary: 'Meeting at office regarding Villa Z Snags',
    statedGoal: 'wants to launch bespoke luxury home design line by 2027',
    annualRevenue: 0,
    lifetimeRevenue: 436727,
    orderGapMonths: 18,
    nps: 4,
    dateStarted: '2022-11-20',
    avgPaymentDelayDays: 30
  },
  { 
    id: 5, 
    name: 'Thabo Khumalo', 
    company: 'Greenfields Dev', 
    type: 'Developer', 
    email: 'thabo@greenfields.co.za', 
    phone: '063 123 4567', 
    projects: 4, 
    status: 'Active',
    lastProjectDate: '2025-02-03',
    lastContactDate: '2025-02-10',
    lastContactSummary: 'Call regarding Handover of Nandos',
    statedGoal: 'Client wants to open 3 new retail stores by 2027',
    annualRevenue: 0,
    lifetimeRevenue: 180460,
    orderGapMonths: 8,
    nps: 7,
    dateStarted: '2025-02-03',
    avgPaymentDelayDays: 8
  },
  { 
    id: 6, 
    name: 'Nina Stroebel', 
    company: 'Private Client', 
    type: 'Private', 
    email: 'nina.s@gmail.com', 
    phone: '084 321 6543', 
    projects: 4, 
    status: 'Active',
    lastProjectDate: '2025-06-23',
    lastContactDate: '2025-07-01',
    lastContactSummary: 'Email follow up on residential layouts',
    statedGoal: 'wants to build double-story coastal holiday home by 2027',
    annualRevenue: 0,
    lifetimeRevenue: 306415,
    orderGapMonths: 8,
    nps: 8,
    dateStarted: '2025-06-23',
    avgPaymentDelayDays: 5
  }
];

const initialLeads = {
  Enquiry: [
    {
      id: 1,
      title: 'Clifton villa',
      client: 'Sarah Venter',
      designValue: 120000,
      productValue: 160000,
      value: 280000,
      offering: 'Signature',
      owner: 'Dani',
      probability: 80,
      priority: 'High',
      createdDate: '2026-05-15',
      estimateApprovalDate: '2026-06-15',
      stageHistory: { Enquiry: '2026-05-15' },
      nextAction: 'Confirm organic glass layout details',
      nextActionDate: '2026-05-20',
      notes: [
        { id: 1, author: 'Dani', text: 'Sarah requested custom fittings. Prefers organic glass design.', date: '2026-05-15 10:30' }
      ],
      activities: [
        { id: 1, text: 'Lead created by Dani', date: '2026-05-15 09:00' },
        { id: 2, text: 'Moved to Enquiry stage', date: '2026-05-15 09:05' }
      ],
      documents: [
        { id: 1, name: 'Clifton_Villa_Brief.pdf', size: '1.4 MB', date: '2026-05-15' }
      ]
    },
    {
      id: 2,
      title: 'Waterfall retail',
      client: 'Thabo Khumalo',
      designValue: 40000,
      productValue: 55000,
      value: 95000,
      offering: 'Modus',
      owner: 'Martin',
      probability: 45,
      priority: 'Low',
      createdDate: '2026-05-12',
      estimateApprovalDate: '2026-06-20',
      stageHistory: { Enquiry: '2026-05-12' },
      nextAction: 'Check budget options for retail layout',
      nextActionDate: '2026-05-18',
      notes: [],
      activities: [
        { id: 1, text: 'Lead created by Martin', date: '2026-05-12 11:15' }
      ],
      documents: []
    }
  ],
  Proposal: [
    {
      id: 3,
      title: 'Steyn City estate',
      client: 'James Motloung',
      designValue: 220000,
      productValue: 300000,
      value: 520000,
      offering: 'Signature',
      owner: 'Alex',
      probability: 70,
      priority: 'High',
      createdDate: '2026-05-05',
      estimateApprovalDate: '2026-06-10',
      stageHistory: { Enquiry: '2026-05-05', Proposal: '2026-05-10' },
      nextAction: 'Follow up on sent proposal PDF',
      nextActionDate: '2026-05-14',
      notes: [
        { id: 1, author: 'Alex', text: 'Proposal sent. James said the budget is flexible.', date: '2026-05-10 16:40' }
      ],
      activities: [
        { id: 1, text: 'Lead created by Alex', date: '2026-05-05 09:30' },
        { id: 2, text: 'Moved to Proposal stage', date: '2026-05-10 14:00' }
      ],
      documents: [
        { id: 1, name: 'Steyn_City_Proposal_V2.pdf', size: '2.8 MB', date: '2026-05-10' }
      ]
    },
    {
      id: 4,
      title: 'Hyde Park penthouse',
      client: 'Nina Stroebel',
      designValue: 80000,
      productValue: 100000,
      value: 180000,
      offering: 'Professional',
      owner: 'Dani',
      probability: 60,
      priority: 'Low',
      createdDate: '2026-05-08',
      estimateApprovalDate: '2026-06-05',
      stageHistory: { Enquiry: '2026-05-08', Proposal: '2026-05-12' },
      nextAction: 'Schedule technical lighting demo',
      nextActionDate: '2026-05-22',
      notes: [],
      activities: [
        { id: 1, text: 'Lead created by Dani', date: '2026-05-08 10:00' },
        { id: 2, text: 'Moved to Proposal stage', date: '2026-05-12 15:30' }
      ],
      documents: []
    }
  ],
  Negotiation: [
    {
      id: 5,
      title: 'Bali resort',
      client: 'Marco Esteves',
      designValue: 390000,
      productValue: 500000,
      value: 890000,
      offering: 'Signature',
      owner: 'Sarah',
      probability: 90,
      priority: 'High',
      createdDate: '2026-04-20',
      estimateApprovalDate: '2026-05-30',
      stageHistory: { Enquiry: '2026-04-20', Proposal: '2026-04-25', Negotiation: '2026-05-05' },
      nextAction: 'Review discount contract SLA terms',
      nextActionDate: '2026-05-19',
      notes: [
        { id: 1, author: 'Sarah', text: 'Negotiating product volume discount.', date: '2026-05-06 12:00' }
      ],
      activities: [
        { id: 1, text: 'Lead created by Sarah', date: '2026-04-20 08:30' },
        { id: 2, text: 'Moved to Proposal stage', date: '2026-04-25 10:15' },
        { id: 3, text: 'Moved to Negotiation stage', date: '2026-05-05 11:00' }
      ],
      documents: [
        { id: 1, name: 'Product_List_Discounted.xlsx', size: '1.1 MB', date: '2026-05-05' }
      ]
    }
  ],
  'Signed': [
    {
      id: 6,
      title: 'Upper Primrose',
      client: 'Sarah Venter',
      designValue: 890000,
      productValue: 1000000,
      value: 1890000,
      offering: 'Signature',
      owner: 'Dani',
      probability: 100,
      priority: 'High',
      createdDate: '2026-04-29',
      estimateApprovalDate: '2026-05-12',
      stageHistory: { Enquiry: '2026-04-29', Proposal: '2026-05-01', Negotiation: '2026-05-05', Signed: '2026-05-12' },
      nextAction: 'Setup initial site kickoff meeting',
      nextActionDate: '2026-05-25',
      notes: [],
      activities: [
        { id: 1, text: 'Lead created by Dani', date: '2026-04-29 09:00' },
        { id: 2, text: 'Moved to Proposal stage', date: '2026-05-01 14:00' },
        { id: 3, text: 'Moved to Negotiation stage', date: '2026-05-05 11:30' },
        { id: 4, text: 'Lead Signed! Converted by Dani', date: '2026-05-12 16:00' }
      ],
      documents: [
        { id: 1, name: 'Signed_Contract_UP.pdf', size: '4.2 MB', date: '2026-05-12' }
      ]
    }
  ],
  Lost: [
    {
      id: 7,
      title: 'Sandton office',
      client: 'James Motloung',
      designValue: 120000,
      productValue: 200000,
      value: 320000,
      offering: 'Modus',
      owner: 'Alex',
      probability: 0,
      priority: 'High',
      createdDate: '2026-05-01',
      estimateApprovalDate: '2026-05-15',
      stageHistory: { Enquiry: '2026-05-01', Proposal: '2026-05-05', Negotiation: '2026-05-10', Lost: '2026-05-15' },
      nextAction: 'Conduct post-mortem lost meeting',
      nextActionDate: '2026-05-16',
      lossReason: 'Price Too High',
      notes: [
        { id: 1, author: 'Alex', text: 'Lost to competitor offering lower fee.', date: '2026-05-15 15:30' }
      ],
      activities: [
        { id: 1, text: 'Lead created by Alex', date: '2026-05-01 10:00' },
        { id: 2, text: 'Moved to Proposal stage', date: '2026-05-05 11:00' },
        { id: 3, text: 'Moved to Negotiation stage', date: '2026-05-10 14:20' },
        { id: 4, text: 'Lead lost. Client went with cheaper competitor', date: '2026-05-15 15:30' }
      ],
      documents: []
    }
  ]
};

const initialStore = {
  upper: {
    key: 'upper',
    client: 'Sarah Venter',
    name: 'Upper Primrose',
    projectType: 'Design & Orders',
    offering: 'Signature',
    sqm: '3,700',
    pm: 'Dani',
    stage: 'Stage 1',
    status: 'On track',
    delay: 'Awaiting feedback/approval',
    start: '29 Apr 2026',
    deadline: '12 May',
    daysLeft: '−2',
    complete: 'Ongoing',
    s1: '✓', s2: '', s3: '', s4: '', s5: '',
    targetMargin: 18,
    actualMargin: 20,
    designFees: [
      { 
        id: 'DF-UPPER-01', 
        name: 'Main Residence Design Fee', 
        sqm: 995, 
        feeValue: 1888225, 
        paid: 1039264, 
        outstanding: 848961, 
        margin: 20, 
        status: 'Approved', 
        proposalPdf: 'DFP-UPPER-MAIN-2026.pdf',
        files: [
          { id: 'F-UPPER-001', name: 'DFP-UPPER-MAIN-2026.pdf', category: 'Proposal PDF', date: '2 May 2026', size: '2.4 MB' },
          { id: 'F-UPPER-002', name: 'ConceptLayout_v1.dwg', category: 'Drawing', date: '5 May 2026', size: '14.8 MB' }
        ]
      }
    ],
    orders: [
      { 
        id: 'PO-2025-042', 
        supplier: 'Molecule Dist.', 
        items: 73, 
        value: 21385, 
        paid: 21385, 
        outstanding: 0, 
        status: 'In transit', 
        eta: '16 May',
        costValue: 14616,
        discount: 0,
        itemsList: [
          {
            id: 'I-1',
            qty: 3,
            type: 'DL-01A',
            code: '28402 9240 W',
            description: 'Downlight - Entero RD-S 14W 2700K 30° White',
            clientDescription: 'Downlight - 14W 2700K 30° LED IP20 White',
            floor: 'Ground',
            area: 'Passage Way',
            dimming: 'Non-dim',
            brand: 'Delta Light',
            supplier: 'Molecule Dist.',
            unitCost: 2238.63,
            unitTrade: 2695.00,
            unitRetail: 2995.00,
            selection: 'Selection',
            stockStatus: 'Ordered'
          },
          {
            id: 'I-2',
            qty: 20,
            type: 'DL-01A',
            code: 'TA8-WWW',
            description: 'Downlight - Club Series TA8 GU10 White',
            clientDescription: 'Downlight - GU10/Module IP20 White',
            floor: 'Ground',
            area: 'Suite 04',
            dimming: 'Phase',
            brand: 'NEKO',
            supplier: 'Molecule Dist.',
            unitCost: 243.64,
            unitTrade: 295.00,
            unitRetail: 395.00,
            selection: 'Selection',
            stockStatus: 'Ordered'
          },
          {
            id: 'I-3',
            qty: 50,
            type: 'DL-01A.2',
            code: 'LA.42059030',
            description: 'Lamp - Classic 230V GU10 5W 36° Clear',
            clientDescription: 'Lamp - Classic 230V GU10 5W 36° 3000K Clear',
            floor: 'NA',
            area: 'NA',
            dimming: 'Non-dim',
            brand: 'Spazio',
            supplier: 'Molecule Dist.',
            unitCost: 60.55,
            unitTrade: 80.00,
            unitRetail: 90.00,
            selection: 'Non-Selection',
            stockStatus: 'In Stock'
          }
        ]
      }
    ]
  },
  villa: {
    key: 'villa',
    client: 'Marco Esteves',
    name: 'Villa Z',
    projectType: 'Design & Orders',
    offering: 'Signature',
    sqm: '1,580',
    pm: 'Martin',
    stage: 'Stage 3',
    status: 'Off track',
    delay: 'Complex design iteration/rework required',
    start: '22 Nov 2023',
    deadline: 'Overdue',
    daysLeft: '−864',
    complete: 'Ongoing',
    s1: '✓', s2: '✓', s3: '', s4: '', s5: '',
    targetMargin: 18,
    actualMargin: 12,
    designFees: [
      { 
        id: 'DF-VILLA-01', 
        name: 'Villa Z Master Design Proposal', 
        sqm: 1580, 
        feeValue: 400187, 
        paid: 400187, 
        outstanding: 0, 
        margin: 12, 
        status: 'Approved', 
        proposalPdf: 'DFP-VILLA-MAIN.pdf',
        files: [
          { id: 'F-VILLA-001', name: 'DFP-VILLA-MAIN.pdf', category: 'Proposal PDF', date: '24 Nov 2023', size: '1.9 MB' }
        ]
      }
    ],
    orders: [
      {
        id: 'PO-2025-045',
        supplier: 'Modus Lighting',
        items: 18,
        value: 36540,
        paid: 36540,
        outstanding: 0,
        status: 'Pending',
        eta: '22 May',
        costValue: 24360,
        discount: 0,
        itemsList: [
          {
            id: 'I-V1',
            qty: 10,
            type: 'DL-01',
            code: 'MOD-LED-001',
            description: 'Recessed LED Downlight 10W',
            clientDescription: 'Recessed LED Downlight 10W IP20',
            floor: 'Ground',
            area: 'Lounge',
            dimming: 'Non-dim',
            brand: 'Modus',
            supplier: 'Modus Lighting',
            unitCost: 590.00,
            unitTrade: 800.00,
            unitRetail: 890.00,
            selection: 'Selection',
            stockStatus: 'Ordered'
          },
          {
            id: 'I-V2',
            qty: 8,
            type: 'STR-03',
            code: 'MOD-STR-003',
            description: 'Surface Strip 2700K 1200mm',
            clientDescription: 'LED Surface Strip Light 1200mm Warm White',
            floor: 'Ground',
            area: 'Kitchen',
            dimming: 'Phase',
            brand: 'Modus',
            supplier: 'Modus Lighting',
            unitCost: 2307.50,
            unitTrade: 3100.00,
            unitRetail: 3455.00,
            selection: 'Selection',
            stockStatus: 'Ordered'
          }
        ],
        documents: []
      }
    ]
  },
  tambor: {
    key: 'tambor',
    client: 'Nina Stroebel',
    name: 'Tambor 9',
    projectType: 'Design & Orders',
    offering: 'Signature',
    sqm: '1,915',
    pm: 'Martin',
    stage: 'Ongoing',
    status: 'On track',
    delay: '—',
    start: '23 Jun 2026',
    deadline: '12 Aug',
    daysLeft: '90',
    complete: 'Ongoing',
    s1: '✓', s2: '', s3: '', s4: '', s5: '',
    targetMargin: 18,
    actualMargin: 18,
    designFees: [
      { 
        id: 'DF-TAMBOR-01', 
        name: 'Concept Scope Costing', 
        sqm: 1915, 
        feeValue: 292215, 
        paid: 183976, 
        outstanding: 108239, 
        margin: 18, 
        status: 'Approved', 
        proposalPdf: 'DFP-TAMBOR-MAIN.pdf',
        files: [
          { id: 'F-TAMBOR-001', name: 'DFP-TAMBOR-MAIN.pdf', category: 'Proposal PDF', date: '25 Jun 2026', size: '1.5 MB' }
        ]
      }
    ],
    orders: [
      {
        id: 'PO-2025-043',
        supplier: 'Philips Advance',
        items: 30,
        value: 14200,
        paid: 0,
        outstanding: 14200,
        status: 'Pending',
        eta: '20 May',
        costValue: 9300,
        discount: 0,
        itemsList: [
          {
            id: 'I-T1',
            qty: 20,
            type: 'LP-01',
            code: 'LA_12859898',
            description: 'Lamp - Classic LED GU10 5.5W 2700K 36°',
            clientDescription: 'Classic LED GU10 5.5W Warm White',
            floor: 'First',
            area: 'Bedrooms',
            dimming: 'Non-dim',
            brand: 'Spazio',
            supplier: 'Philips Advance',
            unitCost: 65.00,
            unitTrade: 95.00,
            unitRetail: 110.00,
            selection: 'Non-Selection',
            stockStatus: 'In Stock'
          },
          {
            id: 'I-T2',
            qty: 10,
            type: 'DL-02',
            code: 'MOD-LED-001',
            description: 'Recessed LED Downlight 10W',
            clientDescription: 'Recessed LED Downlight 10W IP20',
            floor: 'First',
            area: 'Hallway',
            dimming: 'Non-dim',
            brand: 'Modus',
            supplier: 'Philips Advance',
            unitCost: 800.00,
            unitTrade: 1100.00,
            unitRetail: 1200.00,
            selection: 'Selection',
            stockStatus: 'Ordered'
          }
        ],
        documents: []
      }
    ]
  },
  singita: {
    key: 'singita',
    client: 'James Motloung',
    name: 'Singita Elela',
    projectType: 'Design-Only',
    offering: 'Signature',
    sqm: '4,065',
    pm: 'Dani',
    stage: 'Snags',
    status: 'On track',
    delay: 'Ongoing',
    start: '18 Aug 2025',
    deadline: '1 Oct',
    daysLeft: '−225',
    complete: 'Ongoing',
    s1: '✓', s2: '✓', s3: '✓', s4: '', s5: '',
    targetMargin: 18,
    actualMargin: 18,
    designFees: [
      { 
        id: 'DF-SINGITA-01', 
        name: 'Safari Lodge Main Proposal', 
        sqm: 4065, 
        feeValue: 1002268, 
        paid: 651474, 
        outstanding: 350794, 
        margin: 18, 
        status: 'Approved', 
        proposalPdf: 'DFP-SINGITA-MAIN.pdf',
        files: [
          { id: 'F-SINGITA-001', name: 'DFP-SINGITA-MAIN.pdf', category: 'Proposal PDF', date: '20 Aug 2025', size: '3.1 MB' }
        ]
      }
    ],
    orders: []
  },
  sissou: {
    key: 'sissou',
    client: 'Liezel du Toit',
    name: 'House Sissou',
    projectType: 'Design-Only',
    offering: 'Signature',
    sqm: '—',
    pm: 'Dani',
    stage: 'Stage 2',
    status: 'On track',
    delay: 'Unforeseen technical challenges',
    start: '12 Mar 2024',
    deadline: '1 Jun',
    daysLeft: '18',
    complete: 'Ongoing',
    s1: '✓', s2: '', s3: '', s4: '', s5: '',
    targetMargin: 18,
    actualMargin: 19,
    designFees: [
      { 
        id: 'DF-SISSOU-01', 
        name: 'Concept & Schematic Design Fee', 
        sqm: 1200, 
        feeValue: 618190, 
        paid: 355459, 
        outstanding: 262731, 
        margin: 19, 
        status: 'Approved', 
        proposalPdf: 'DFP-SISSOU-MAIN.pdf',
        files: [
          { id: 'F-SISSOU-001', name: 'DFP-SISSOU-MAIN.pdf', category: 'Proposal PDF', date: '15 Mar 2024', size: '2.0 MB' }
        ]
      }
    ],
    orders: []
  },
  nandos: {
    key: 'nandos',
    client: 'Thabo Khumalo',
    name: "Nando's Stlbsch",
    projectType: 'Orders-Only',
    offering: 'Modus',
    sqm: '480',
    pm: 'Dani',
    stage: 'Complete',
    status: 'On track',
    delay: '—',
    start: '3 Feb 2025',
    deadline: '20 Apr',
    daysLeft: '—',
    complete: 'Complete',
    s1: '✓', s2: '✓', s3: '✓', s4: '✓', s5: '✓',
    targetMargin: 18,
    actualMargin: 18,
    completedDate: '2025-04-20',
    nps: 7,
    designFees: [],
    orders: [
      {
        id: 'PO-2025-010',
        supplier: 'Made by 1-to-1',
        items: 120,
        value: 180460,
        paid: 180460,
        outstanding: 0,
        status: 'Delivered',
        eta: '—',
        costValue: 120000,
        discount: 0,
        itemsList: [
          {
            id: 'I-N1',
            qty: 80,
            type: 'DL-M01',
            code: 'MOD-LED-001',
            description: 'Recessed LED Downlight 10W',
            clientDescription: 'Nando Spec Recessed LED Downlight 10W',
            floor: 'Ground',
            area: 'Dining Area',
            dimming: 'Non-dim',
            brand: 'Modus',
            supplier: 'Made by 1-to-1',
            unitCost: 1000.00,
            unitTrade: 1350.00,
            unitRetail: 1500.00,
            selection: 'Selection',
            stockStatus: 'In Stock'
          },
          {
            id: 'I-N2',
            qty: 40,
            type: 'STR-M02',
            code: 'MOD-STR-003',
            description: 'Surface Strip 2700K 1200mm',
            clientDescription: 'Nando Spec LED Surface Strip 1200mm',
            floor: 'Ground',
            area: 'Kitchen & Counters',
            dimming: 'Phase',
            brand: 'Modus',
            supplier: 'Made by 1-to-1',
            unitCost: 1000.00,
            unitTrade: 1350.00,
            unitRetail: 1511.50,
            selection: 'Selection',
            stockStatus: 'In Stock'
          }
        ],
        documents: []
      }
    ]
  },
  kalahari: {
    key: 'kalahari',
    client: 'Sarah Venter',
    name: 'Kalahari',
    projectType: 'Orders-Only',
    offering: 'Signature',
    sqm: '—',
    pm: 'Martin',
    stage: 'Snags',
    status: 'On track',
    delay: 'Snags/Site visit',
    start: '6 Feb 2024',
    deadline: '1 Jun',
    daysLeft: '18',
    complete: 'Complete',
    s1: '✓', s2: '✓', s3: '✓', s4: '✓', s5: '',
    targetMargin: 18,
    actualMargin: 19,
    completedDate: '2025-06-01',
    nps: 9,
    designFees: [],
    orders: [
      {
        id: 'PO-2025-011',
        supplier: 'Modus Lighting',
        items: 40,
        value: 113500,
        paid: 108175,
        outstanding: 5325,
        status: 'Delivered',
        eta: '—',
        costValue: 74000,
        discount: 0,
        itemsList: [
          {
            id: 'I-K1',
            qty: 30,
            type: 'DL-K01',
            code: 'MOD-LED-001',
            description: 'Recessed LED Downlight 10W',
            clientDescription: 'Kalahari Spec Recessed LED Downlight 10W',
            floor: 'Ground',
            area: 'Lobby & Reception',
            dimming: 'Non-dim',
            brand: 'Modus',
            supplier: 'Modus Lighting',
            unitCost: 1300.00,
            unitTrade: 1800.00,
            unitRetail: 2000.00,
            selection: 'Selection',
            stockStatus: 'In Stock'
          },
          {
            id: 'I-K2',
            qty: 10,
            type: 'STR-K02',
            code: 'MOD-STR-003',
            description: 'Surface Strip 2700K 1200mm',
            clientDescription: 'Kalahari Spec LED Surface Strip 1200mm',
            floor: 'Ground',
            area: 'Conference Rooms',
            dimming: 'Non-dim',
            brand: 'Modus',
            supplier: 'Modus Lighting',
            unitCost: 3500.00,
            unitTrade: 4800.00,
            unitRetail: 5350.00,
            selection: 'Selection',
            stockStatus: 'In Stock'
          }
        ],
        documents: []
      }
    ]
  }
};

export function StoreProvider({ children }) {
  const [projects, setProjects] = useState(initialStore);
  const [contacts, setContacts] = useState(initialContacts);
  const [leads, setLeads] = useState(initialLeads);

  const updateProject = (key, field, value) => {
    setProjects(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value }
    }));
  };

  const addProject = (project) => {
    const key = project.name.toLowerCase().replace(/\s+/g, '-');
    setProjects(prev => ({
      ...prev,
      [key]: { 
        key,
        ...project,
        projectType: project.projectType || 'Design & Orders',
        designFees: project.designFees || [],
        orders: project.orders || [],
        stage: 'Stage 1',
        status: 'On track',
        delay: '—',
        start: new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }),
        deadline: 'TBD',
        daysLeft: '—',
        complete: 'Ongoing',
        s1:'',s2:'',s3:'',s4:'',s5:''
      }
    }));
  };

  const moveLead = (leadId, fromStage, toStage) => {
    setLeads(prev => {
      const lead = prev[fromStage]?.find(l => l.id === leadId);
      if (!lead) return prev;
      
      const todayStr = new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
      const nowTime = new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
      const newActivity = {
        id: Date.now() + Math.random(),
        text: `Moved from stage '${fromStage}' to '${toStage}'`,
        date: `${todayStr} ${nowTime}`
      };
      
      const updatedLead = {
        ...lead,
        stage: toStage,
        stageHistory: {
          ...(lead.stageHistory || {}),
          [toStage]: new Date().toISOString().split('T')[0]
        },
        activities: [
          ...(lead.activities || []),
          newActivity
        ]
      };

      return {
        ...prev,
        [fromStage]: prev[fromStage].filter(l => l.id !== leadId),
        [toStage]: [...(prev[toStage] || []), updatedLead]
      };
    });
  };

  const updateLead = (leadId, currentStage, updatedFields) => {
    setLeads(prev => {
      const stageLeads = prev[currentStage] || [];
      const updated = stageLeads.map(l => {
        if (l.id === leadId) {
          const newFields = { ...updatedFields };
          if (newFields.designValue !== undefined || newFields.productValue !== undefined) {
            const dv = newFields.designValue !== undefined ? Number(newFields.designValue) || 0 : l.designValue || 0;
            const pv = newFields.productValue !== undefined ? Number(newFields.productValue) || 0 : l.productValue || 0;
            newFields.value = dv + pv;
          }
          return {
            ...l,
            ...newFields
          };
        }
        return l;
      });
      return {
        ...prev,
        [currentStage]: updated
      };
    });
  };

  const [attritionLogs, setAttritionLogs] = useState([
    { id: 99, clientId: 4, clientName: 'Marco Esteves', reason: 'PM friction', date: '2026-03-01', notes: 'Budget limits met with PM hand-off friction on Villa Z revisions.' },
    { id: 98, clientId: 101, clientName: 'DevCorp South', reason: 'Price', date: '2026-02-14', notes: 'Felt architectural design fees were 15% too high compared to standard developer packages.' },
    { id: 97, clientId: 102, clientName: 'Apex Designs', reason: 'Competitor', date: '2026-01-05', notes: 'Competitor offered free 3D site modeling in their base proposal.' }
  ]);

  const logAttrition = (clientId, clientName, reason, notes) => {
    setAttritionLogs(prev => [
      ...prev,
      {
        id: Date.now(),
        clientId,
        clientName,
        reason,
        date: new Date().toISOString().split('T')[0],
        notes
      }
    ]);
  };

  return (
    <StoreContext.Provider value={{ projects, updateProject, addProject, contacts, setContacts, leads, setLeads, moveLead, updateLead, attritionLogs, setAttritionLogs, logAttrition }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  return useContext(StoreContext);
}
