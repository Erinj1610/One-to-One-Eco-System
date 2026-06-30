import React, { createContext, useContext, useState } from 'react';
import { API_BASE } from '../api_config';
import { useAuth } from './AuthContext';

const StoreContext = createContext();

const defaultPMs = [
  { id: 'pm-1', name: 'Dani', email: 'dani@1-to-1.world', phone: '083 570 7795', active: true },
  { id: 'pm-2', name: 'Martin', email: 'martin@1-to-1.world', phone: '082 123 4567', active: true },
  { id: 'pm-3', name: 'Alex', email: 'alex@1-to-1.world', phone: '083 765 4321', active: true },
  { id: 'pm-4', name: 'Merlyn', email: 'merlyn@1-to-1.world', phone: '084 987 6543', active: true }
];


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
    avgPaymentDelayDays: 4,
    activities: [
      { id: 1, text: 'Initial meeting at Venter Architects office — discussed Clifton Villa brief and scope.', date: '15 Jan 2024', staff: 'Dani' },
      { id: 2, text: 'Proposal sent for Kalahari Retreat lighting package. Sarah requested revisions on zone 3.', date: '3 Jun 2024', staff: 'Dani' },
      { id: 3, text: 'Site visit — confirmed organic glass layout details for Phase 1.', date: '12 Feb 2026', staff: 'Martin' },
      { id: 4, text: 'Call with JV regarding Kalahari snag list — client satisfied, final sign-off expected next week.', date: '12 May 2026', staff: 'Dani' }
    ]
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
    avgPaymentDelayDays: 14,
    activities: [
      { id: 1, text: 'First project briefing at DM Properties HQ — agreed on Sandton retail scope and timeline.', date: '10 Aug 2023', staff: 'Alex' },
      { id: 2, text: 'Proposal sent for Steyn City Estate lighting design.', date: '5 May 2026', staff: 'Alex' },
      { id: 3, text: 'Signed closure of Sandton retail project — client very satisfied with outcome.', date: '15 Oct 2025', staff: 'Dani' }
    ]
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
    avgPaymentDelayDays: 2,
    activities: [
      { id: 1, text: 'Intro call — Liezel referred by Venter Architects. Interested in holiday home renovations.', date: '12 Mar 2024', staff: 'Dani' },
      { id: 2, text: 'Email follow up on fee calculation for Home 2 renovation.', date: '1 Apr 2026', staff: 'Martin' }
    ]
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
    avgPaymentDelayDays: 30,
    activities: [
      { id: 1, text: 'First engagement — Marco reached out regarding Villa Z bespoke fittings.', date: '20 Nov 2022', staff: 'Dani' },
      { id: 2, text: 'Design review meeting — client raised concerns about lead times on imported fixtures.', date: '8 May 2023', staff: 'Dani' },
      { id: 3, text: 'Meeting at office regarding Villa Z snag list — unresolved items escalated.', date: '10 May 2024', staff: 'Martin' }
    ]
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
    avgPaymentDelayDays: 8,
    activities: [
      { id: 1, text: 'Project briefing — Thabo confirmed Waterfall retail space layout requirements.', date: '3 Feb 2025', staff: 'Martin' },
      { id: 2, text: 'Call regarding handover of Nandos Rosebank — client accepted punch list.', date: '10 Feb 2025', staff: 'Dani' }
    ]
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
    avgPaymentDelayDays: 5,
    activities: [
      { id: 1, text: 'Intro meeting — Nina referred via Esteves Design. Coastal holiday home brief discussed.', date: '23 Jun 2025', staff: 'Dani' },
      { id: 2, text: 'Email follow up on residential layout options and material selections.', date: '1 Jul 2025', staff: 'Martin' }
    ]
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
        id: 'DF-2025-001', 
        name: 'Molecule Dist. Design Fee', 
        company: 'Venter Architects',
        projectName: 'Upper Primrose',
        leadDesigner: 'Merlyn',
        feeType: 'Fixed Phase',
        feeTerms: '30 days',
        sqm: 995, 
        feeValue: 148750, 
        amountInvoiced: 133150,
        paid: 117550, 
        outstanding: 15600, 
        margin: 20, 
        status: 'WIP',
        feeStatus: 'Concept Phase',
        proposalPdf: 'DFP-UPPER-MAIN-2026.pdf',
        files: [
          { id: 'F-UPPER-001', name: 'DFP-UPPER-MAIN-2026.pdf', category: 'Proposal PDF', date: '2 May 2026', size: '2.4 MB' },
          { id: 'F-UPPER-002', name: 'ConceptLayout_v1.dwg', category: 'Drawing', date: '5 May 2026', size: '14.8 MB' }
        ],
        phases: [
          {
            phase: 'PHASE 1 CONCEPT',
            serviceCode: 'DS-001A',
            description: 'Moodboards & Space Planning Layout',
            estHours: 15,
            hourlyRate: 1800,
            phaseFee: 27000,
            actHours: 12,
            totalValue: 21600,
            billedFee: 27000,
            unbilledFee: 0,
            progress: 100,
            nextMilestone: 'Concept Design'
          },
          {
            phase: 'PHASE 2 DEVELOP',
            serviceCode: 'DS-002',
            description: 'Custom Joinery Detail Drawing Set',
            estHours: 40,
            hourlyRate: 1950,
            phaseFee: 78000,
            actHours: 32,
            totalValue: 62400,
            billedFee: 62400,
            unbilledFee: 15600,
            progress: 80,
            nextMilestone: 'Development (Ground)'
          },
          {
            phase: 'PHASE 3 DOCS',
            serviceCode: 'DS-003.2',
            description: 'Finishes & Fixture Schedule Update',
            estHours: 25,
            hourlyRate: 1750,
            phaseFee: 43750,
            actHours: 25,
            totalValue: 43750,
            billedFee: 43750,
            unbilledFee: 0,
            progress: 100,
            nextMilestone: 'Documentation'
          }
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
        id: 'DF-2025-002', 
        name: 'Modus Lighting Design Fee', 
        company: 'Esteves Design',
        projectName: 'Villa Z',
        leadDesigner: 'Alex',
        feeType: 'Hourly WIP',
        feeTerms: '15 days',
        sqm: 1580, 
        feeValue: 94500, 
        amountInvoiced: 65250,
        paid: 65250, 
        outstanding: 0, 
        margin: 12, 
        status: 'WIP', 
        feeStatus: 'Detail Design',
        proposalPdf: 'DFP-VILLA-MAIN.pdf',
        files: [
          { id: 'F-VILLA-001', name: 'DFP-VILLA-MAIN.pdf', category: 'Proposal PDF', date: '24 Nov 2023', size: '1.9 MB' }
        ],
        phases: [
          {
            phase: 'PHASE 1 CONCEPT',
            serviceCode: 'DS-001A',
            description: 'Moodboards & Space Planning Layout',
            estHours: 20,
            hourlyRate: 1800,
            phaseFee: 36000,
            actHours: 20,
            totalValue: 36000,
            billedFee: 36000,
            unbilledFee: 0,
            progress: 100,
            nextMilestone: 'Concept Design'
          },
          {
            phase: 'PHASE 2 DEVELOP',
            serviceCode: 'DS-002',
            description: 'Custom Joinery Detail Drawing Set',
            estHours: 30,
            hourlyRate: 1950,
            phaseFee: 58500,
            actHours: 15,
            totalValue: 29250,
            billedFee: 29250,
            unbilledFee: 0,
            progress: 50,
            nextMilestone: 'Development (Ground)'
          }
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
        id: 'DF-2025-003', 
        name: 'Philips Advance Design Fee', 
        company: 'Private Client',
        projectName: 'Tambor 9',
        leadDesigner: 'Sarah',
        feeType: 'Hourly WIP',
        feeTerms: '30 days',
        sqm: 1915, 
        feeValue: 66750, 
        amountInvoiced: 57000,
        paid: 57000, 
        outstanding: 0, 
        margin: 18, 
        status: 'WIP', 
        feeStatus: 'Documentation',
        proposalPdf: 'DFP-TAMBOR-MAIN.pdf',
        files: [
          { id: 'F-TAMBOR-001', name: 'DFP-TAMBOR-MAIN.pdf', category: 'Proposal PDF', date: '25 Jun 2026', size: '1.5 MB' }
        ],
        phases: [
          {
            phase: 'PHASE 1 CONCEPT',
            serviceCode: 'DS-001A',
            description: 'Moodboards & Space Planning Layout',
            estHours: 10,
            hourlyRate: 1800,
            phaseFee: 18000,
            actHours: 10,
            totalValue: 18000,
            billedFee: 18000,
            unbilledFee: 0,
            progress: 100,
            nextMilestone: 'Concept Design'
          },
          {
            phase: 'PHASE 2 DEVELOP',
            serviceCode: 'DS-002',
            description: 'Custom Joinery Detail Drawing Set',
            estHours: 25,
            hourlyRate: 1950,
            phaseFee: 48750,
            actHours: 20,
            totalValue: 39000,
            billedFee: 39000,
            unbilledFee: 0,
            progress: 80,
            nextMilestone: 'Development (Ground)'
          }
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
        company: 'DM Properties',
        projectName: 'Singita Elela',
        leadDesigner: 'Sarah',
        feeType: 'Fixed Phase',
        feeTerms: '30 days',
        sqm: 4065, 
        feeValue: 1002268, 
        paid: 651474, 
        outstanding: 350794, 
        margin: 18, 
        status: 'Approved', 
        feeStatus: 'Completed',
        proposalPdf: 'DFP-SINGITA-MAIN.pdf',
        files: [
          { id: 'F-SINGITA-001', name: 'DFP-SINGITA-MAIN.pdf', category: 'Proposal PDF', date: '20 Aug 2025', size: '3.1 MB' }
        ],
        phases: [
          {
            phase: 'PHASE 1 CONCEPT',
            serviceCode: 'DS-001A',
            description: 'Moodboards & Space Planning Layout',
            estHours: 100,
            hourlyRate: 1800,
            phaseFee: 180000,
            actHours: 100,
            totalValue: 180000,
            billedFee: 180000,
            unbilledFee: 0,
            progress: 100,
            nextMilestone: 'Concept Design'
          }
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
        company: 'LdT Interiors',
        projectName: 'House Sissou',
        leadDesigner: 'Dani',
        feeType: 'Hourly WIP',
        feeTerms: '30 days',
        sqm: 1200, 
        feeValue: 618190, 
        paid: 355459, 
        outstanding: 262731, 
        margin: 19, 
        status: 'Approved', 
        feeStatus: 'Detail Design',
        proposalPdf: 'DFP-SISSOU-MAIN.pdf',
        files: [
          { id: 'F-SISSOU-001', name: 'DFP-SISSOU-MAIN.pdf', category: 'Proposal PDF', date: '15 Mar 2024', size: '2.0 MB' }
        ],
        phases: [
          {
            phase: 'PHASE 1 CONCEPT',
            serviceCode: 'DS-001A',
            description: 'Moodboards & Space Planning Layout',
            estHours: 50,
            hourlyRate: 1800,
            phaseFee: 90000,
            actHours: 50,
            totalValue: 90000,
            billedFee: 90000,
            unbilledFee: 0,
            progress: 100,
            nextMilestone: 'Concept Design'
          }
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
    designFees: [
      { 
        id: 'DF-2025-004', 
        name: 'Made by 1-to-1 Design Fee', 
        company: 'Greenfields Dev',
        projectName: "Nando's Stlbsch",
        leadDesigner: 'Dani',
        feeType: 'Fixed Phase',
        feeTerms: 'COD',
        sqm: 480, 
        feeValue: 132000, 
        amountInvoiced: 132000,
        paid: 132000, 
        outstanding: 0, 
        margin: 18, 
        status: 'Completed', 
        feeStatus: 'Completed',
        files: [],
        phases: [
          {
            phase: 'PHASE 1 CONCEPT',
            serviceCode: 'DS-001A',
            description: 'Moodboards & Space Planning Layout',
            estHours: 30,
            hourlyRate: 1800,
            phaseFee: 54000,
            actHours: 30,
            totalValue: 54000,
            billedFee: 54000,
            unbilledFee: 0,
            progress: 100,
            nextMilestone: 'Concept Design'
          },
          {
            phase: 'PHASE 2 DEVELOP',
            serviceCode: 'DS-002',
            description: 'Custom Joinery Detail Drawing Set',
            estHours: 40,
            hourlyRate: 1950,
            phaseFee: 78000,
            actHours: 40,
            totalValue: 78000,
            billedFee: 78000,
            unbilledFee: 0,
            progress: 100,
            nextMilestone: 'Development (Ground)'
          }
        ]
      }
    ],
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
    designFees: [
      { 
        id: 'DF-2025-005', 
        name: 'Modus Lighting Design Fee', 
        company: 'Venter Architects',
        projectName: 'Kalahari',
        leadDesigner: 'Merlyn',
        feeType: 'Percentage of BOQ',
        feeTerms: '30 days',
        sqm: 1000, 
        feeValue: 45000, 
        amountInvoiced: 45000,
        paid: 45000, 
        outstanding: 0, 
        margin: 19, 
        status: 'Completed', 
        feeStatus: 'Completed',
        files: [],
        phases: [
          {
            phase: 'PHASE 1 CONCEPT',
            serviceCode: 'DS-001A',
            description: 'Moodboards & Space Planning Layout',
            estHours: 25,
            hourlyRate: 1800,
            phaseFee: 45000,
            actHours: 25,
            totalValue: 45000,
            billedFee: 45000,
            unbilledFee: 0,
            progress: 100,
            nextMilestone: 'Concept Design'
          }
        ]
      }
    ],
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

const defaultInvoices = [
  { id: 'INV-2025-087', project: 'Upper Primrose', client: 'Sarah Venter', amount: 'R 524,120', due: '30 May 2025', issued: '1 May 2025',  status: 'Overdue',  paid: false },
  { id: 'INV-2025-088', project: 'Singita Elela',  client: 'James Motloung',   amount: 'R 248,600', due: '15 Jun 2025', issued: '15 May 2025', status: 'Unpaid',   paid: false },
  { id: 'INV-2025-089', project: 'Tambor 9',       client: 'Nina Stroebel',       amount: 'R 122,439', due: '22 Jun 2025', issued: '22 May 2025', status: 'Draft',    paid: false },
  { id: 'INV-2025-084', project: 'Nando\'s Rosebank', client: 'Thabo Khumalo',   amount: 'R 180,460', due: '10 Apr 2025', issued: '10 Mar 2025', status: 'Paid',     paid: true },
  { id: 'INV-2025-083', project: 'Kalahari',       client: 'Sarah Venter',    amount: 'R 89,700',  due: '2 Apr 2025',  issued: '2 Mar 2025',  status: 'Paid',     paid: true },
];

export function StoreProvider({ children }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState({});
  const [contacts, setContacts] = useState([]);
  const [leads, setLeads] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [projectManagers, setProjectManagers] = useState([]);

  const defaultSettings = {
    crm: {
      lostClients: true,
      inactiveClients: true,
      npsReview: true
    },
    design: {
      outstandingFees: true,
      upcomingDeadlines: true
    },
    projects: {
      overdueDeadlines: true,
      lowMargins: true,
      outstandingDesignFees: true,
      orderLogisticsAlerts: true,
      productApprovalAlerts: true
    },
    orders: {
      logisticsHolds: true,
      backorderedIssues: true,
      lowMarginOrders: true
    },
    customRules: [
      {
        id: 'rule-margin',
        module: 'projects',
        parameter: 'margin',
        condition: 'less_than',
        value: 39,
        label: 'Project margin is below 39%'
      },
      {
        id: 'rule-nps',
        module: 'crm',
        parameter: 'nps',
        condition: 'less_than',
        value: 6,
        label: 'Client NPS score is below 6'
      },
      {
        id: 'rule-outstanding',
        module: 'design',
        parameter: 'outstanding',
        condition: 'greater_than',
        value: 1000,
        label: 'Outstanding design fee is greater than R 1,000'
      }
    ]
  };

  const [alertSettings, setAlertSettings] = useState(defaultSettings);

  const defaultModules = [
    { id: 'dashboard', label: 'Dashboard', icon: 'Home', path: '/dashboard', sectionId: 'general', visible: true, order: 0 },
    { id: 'crm', label: 'CRM', icon: 'Users', path: '/crm', sectionId: 'clients_sales', visible: true, order: 1 },
    { id: 'projects', label: 'Projects', icon: 'Layout', path: '/projects', sectionId: 'projects_sec', visible: true, order: 2 },
    { id: 'design', label: 'Design', icon: 'Calculator', path: '/design', sectionId: 'projects_sec', visible: true, order: 3 },
    { id: 'orders', label: 'Orders', icon: 'ClipboardList', path: '/orders', sectionId: 'projects_sec', visible: true, order: 4 },
    { id: 'purchasing', label: 'Purchasing & Receiving', icon: 'ClipboardList', path: '/purchasing', sectionId: 'projects_sec', visible: true, order: 5 },
    { id: 'logistics', label: 'Logistics', icon: 'Truck', path: '/logistics', sectionId: 'projects_sec', visible: true, order: 6 },
    { id: 'invoices', label: 'Invoices', icon: 'FileText', path: '/invoices', sectionId: 'projects_sec', visible: true, order: 7 },
    { id: 'sales_tracker', label: 'Sales tracker', icon: 'TrendingUp', path: '/sales-tracker', sectionId: 'projects_sec', visible: true, order: 8 },
    { id: 'tracker', label: 'Design fee tracker', icon: 'Compass', path: '/tracker', sectionId: 'projects_sec', visible: true, order: 9 },
    { id: 'pipeline', label: 'Sales pipeline', icon: 'TrendingUp', path: '/pipeline', sectionId: 'other_modules', visible: true, order: 10 },
    { id: 'products', label: 'Products', icon: 'Package', path: '/products', sectionId: 'other_modules', visible: true, order: 11 },
    { id: 'docs', label: 'Documents', icon: 'Folder', path: '/docs', sectionId: 'other_modules', visible: true, order: 12 },
    { id: 'hr', label: 'HR & people', icon: 'BadgeCheck', path: '/hr', sectionId: 'other_modules', visible: true, order: 13 },
    { id: 'reports', label: 'Reports', icon: 'BarChart', path: '/reports', sectionId: 'other_modules', visible: true, order: 14 },
    { id: 'support', label: 'Support', icon: 'Headset', path: '/support', sectionId: 'other_modules', visible: true, order: 15 }
  ];
  const defaultSections = [
    { id: 'general', label: 'General', order: 0 },
    { id: 'clients_sales', label: 'Clients & sales', order: 1 },
    { id: 'projects_sec', label: 'Projects', order: 2 },
    { id: 'other_modules', label: 'Other modules', order: 3 }
  ];

  const [moduleConfig, setModuleConfig] = useState({ modules: defaultModules, sections: defaultSections });

  // References to trace when backend fetch is completed so we don't save default values on load
  const isLoaded = React.useRef({
    projects: false,
    contacts: false,
    leads: false,
    invoices: false,
    alertSettings: false,
    moduleConfig: false,
    projectManagers: false
  });

  const getModuleName = (moduleId, fallback) => {
    const found = moduleConfig.modules.find(m => m.id === moduleId);
    return found ? found.label : fallback;
  };

  // Load all states when user logs in
  React.useEffect(() => {
    if (!user) {
      // If user logs out, reset loaded states
      isLoaded.current = {
        projects: false,
        contacts: false,
        leads: false,
        invoices: false,
        alertSettings: false,
        moduleConfig: false,
        projectManagers: false
      };
      return;
    }

    const loadState = (key, setter) => {
      fetch(`${API_BASE}/api/settings/${key}`)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          return res.json();
        })
        .then(data => {
          if (data && data.value !== null && data.value !== undefined) {
            if (key === 'moduleConfig') {
              const loadedVal = data.value;
              const loadedModules = loadedVal.modules || [];
              const mergedModules = [...loadedModules];
              defaultModules.forEach(defM => {
                if (!loadedModules.some(m => m.id === defM.id)) {
                  mergedModules.push(defM);
                }
              });
              setter({ ...loadedVal, modules: mergedModules });
            } else {
              setter(data.value);
            }
          } else if (key === 'projectManagers') {
            setter(defaultPMs);
          }
          isLoaded.current[key] = true;
        })
        .catch(err => {
          console.error(`Error loading ${key}:`, err);
          if (key === 'projectManagers') {
            setter(defaultPMs);
          }
          isLoaded.current[key] = true;
        });
    };

    loadState('projects', setProjects);
    loadState('contacts', setContacts);
    loadState('leads', setLeads);
    loadState('invoices', setInvoices);
    loadState('alertSettings', setAlertSettings);
    loadState('moduleConfig', setModuleConfig);
    loadState('projectManagers', setProjectManagers);
  }, [user]);

  // Save states on changes (excluding initial load)
  const saveState = (key, value) => {
    if (!user || !isLoaded.current[key]) return;
    fetch(`${API_BASE}/api/settings/${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value })
    }).catch(err => console.error(`Error saving ${key}:`, err));
  };

  React.useEffect(() => { saveState('projects', projects); }, [projects]);
  React.useEffect(() => { saveState('contacts', contacts); }, [contacts]);
  React.useEffect(() => { saveState('leads', leads); }, [leads]);
  React.useEffect(() => { saveState('invoices', invoices); }, [invoices]);
  React.useEffect(() => { saveState('alertSettings', alertSettings); }, [alertSettings]);
  React.useEffect(() => { saveState('moduleConfig', moduleConfig); }, [moduleConfig]);
  React.useEffect(() => { saveState('projectManagers', projectManagers); }, [projectManagers]);



  const addInvoice = (invoice) => {
    setInvoices(prev => [invoice, ...prev]);
  };

  const updateProject = (key, field, value) => {
    setProjects(prev => {
      if (typeof field === 'object' && field !== null) {
        return {
          ...prev,
          [key]: { ...prev[key], ...field }
        };
      }
      return {
        ...prev,
        [key]: { ...prev[key], [field]: value }
      };
    });
  };

  const addProject = (project) => {
    const baseKey = (project.name || 'new-project').toLowerCase().trim().replace(/\s+/g, '-');
    let key = baseKey || 'new-project';
    let counter = 1;
    while (projects[key]) {
      key = `${baseKey}-${counter}`;
      counter++;
    }
    setProjects(prev => ({
      ...prev,
      [key]: { 
        ...project,
        key,
        projectType: project.projectType || 'Design & Orders',
        designFees: project.designFees || [],
        orders: project.orders || [],
        stage: project.stage || 'Stage 1',
        status: project.status || 'On track',
        delay: '—',
        start: project.start || new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }),
        deadline: project.deadline || 'TBD',
        daysLeft: '—',
        complete: 'Ongoing',
        s1:'',s2:'',s3:'',s4:'',s5:''
      }
    }));
    return key;
  };

  const saveDraftProject = (oldKey, projectData) => {
    const baseKey = (projectData.name || 'unnamed-project').toLowerCase().trim().replace(/\s+/g, '-');
    let finalKey = baseKey || 'unnamed-project';
    setProjects(prev => {
      const next = { ...prev };
      const existingDraft = prev[oldKey] || {};
      delete next[oldKey];
      
      let counter = 1;
      while (next[finalKey]) {
        finalKey = `${baseKey}-${counter}`;
        counter++;
      }

      next[finalKey] = {
        ...existingDraft,
        ...projectData,
        key: finalKey,
        isDraft: false,
        stage: 'Stage 1',
        status: 'On track'
      };
      return next;
    });
    return finalKey;
  };

  const deleteProject = (key) => {
    setProjects(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
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

  const moveOrder = (orderId, oldProjectKey, newProjectKey, clientContact, clientCompany, clientPhone, clientEmail) => {
    setProjects(prev => {
      const next = { ...prev };
      
      // Get the order from the old project
      const oldProj = next[oldProjectKey];
      if (!oldProj) return prev;
      
      const order = (oldProj.orders || []).find(o => o.id === orderId);
      if (!order) return prev;
      
      // Remove from old project
      oldProj.orders = (oldProj.orders || []).filter(o => o.id !== orderId);
      
      // Prepare order with updated client details
      const updatedOrder = {
        ...order,
        clientContact: clientContact || order.clientContact,
        clientCompany: clientCompany || order.clientCompany,
        clientPhone: clientPhone !== undefined ? clientPhone : order.clientPhone,
        clientEmail: clientEmail !== undefined ? clientEmail : order.clientEmail,
        projectKey: newProjectKey
      };
      
      // Ensure the new project exists (it could be a virtual client-only project)
      if (!next[newProjectKey]) {
        next[newProjectKey] = {
          key: newProjectKey,
          name: newProjectKey.startsWith('client-') ? `${clientContact} (Direct Client)` : 'Direct Client Project',
          client: clientContact,
          projectType: 'Client-Direct',
          orders: [],
          designFees: [],
          stage: 'Stage 1',
          status: 'On track',
          start: new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }),
          deadline: 'TBD'
        };
      }
      
      // Add to new project
      next[newProjectKey].orders = [...(next[newProjectKey].orders || []), updatedOrder];
      
      return next;
    });
  };

  const moveDesignFee = (feeId, oldProjectKey, newProjectKey, clientContact, clientCompany) => {
    setProjects(prev => {
      const next = { ...prev };
      
      // Get the design fee from the old project
      const oldProj = next[oldProjectKey];
      if (!oldProj) return prev;
      
      const fee = (oldProj.designFees || []).find(f => f.id === feeId);
      if (!fee) return prev;
      
      // Remove from old project
      oldProj.designFees = (oldProj.designFees || []).filter(f => f.id !== feeId);
      
      // Prepare fee with updated client/project details
      const updatedFee = {
        ...fee,
        projectClient: clientContact || fee.projectClient,
        clientCompany: clientCompany || fee.clientCompany,
        projectName: newProjectKey.startsWith('client-') ? `${clientContact} (Direct Client)` : (next[newProjectKey]?.name || fee.projectName),
        projectKey: newProjectKey
      };
      
      // Ensure the new project exists (virtual client-only project)
      if (!next[newProjectKey]) {
        next[newProjectKey] = {
          key: newProjectKey,
          name: newProjectKey.startsWith('client-') ? `${clientContact} (Direct Client)` : 'Direct Client Project',
          client: clientContact,
          projectType: 'Client-Direct',
          orders: [],
          designFees: [],
          stage: 'Stage 1',
          status: 'On track',
          start: new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }),
          deadline: 'TBD'
        };
      }
      
      // Add to new project
      next[newProjectKey].designFees = [...(next[newProjectKey].designFees || []), updatedFee];
      
      return next;
    });
  };

  return (
    <StoreContext.Provider value={{ 
      projects, 
      updateProject, 
      addProject, 
      saveDraftProject, 
      deleteProject, 
      contacts, 
      setContacts, 
      leads, 
      setLeads, 
      moveLead, 
      updateLead, 
      attritionLogs, 
      setAttritionLogs, 
      logAttrition, 
      invoices, 
      setInvoices, 
      addInvoice,
      moveOrder,
      moveDesignFee,
      alertSettings,
      setAlertSettings,
      moduleConfig,
      setModuleConfig,
      getModuleName,
      projectManagers,
      setProjectManagers
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  return useContext(StoreContext);
}
