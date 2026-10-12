/*
 * Module content. Edit this file to update the learning object.
 * Bedrock facts change quickly: keep the model-selection framework stable
 * and treat anything product-specific as reference to verify.
 */
window.MODULE = {
  title: "Talking Bedrock with customers",
  passMark: 80,
  scenarioMax: 12,
  quizMax: 5,

  disclaimer:
    "Amazon Bedrock changes quickly. Check the current AWS documentation before you quote a specific model, feature, price, or limit to a customer.",

  objectives: [
    "Open a conversation about generative AI by finding a use case, not by naming a model.",
    "Place a customer's use case in one of three adoption zones.",
    "Explain how to shortlist model families using seven selection criteria.",
    "Stay credible and useful when capacity is limited."
  ],

  warmup: {
    customer: "Our investors keep asking about our AI plan. Where do we even start?",
    note: "A CEO says this to you in your first call. Pick your reply.",
    options: [
      {
        text: "Bedrock gives you access to models from several providers through one API. Want to see a demo?",
        score: 0,
        why: "Accurate, but it answers a question the customer didn't ask. A demo of a product is a poor starting point when they don't yet know what they want it to do."
      },
      {
        text: "Which process, or which moment for your own customers, would change the most if it got faster or smarter?",
        score: 2,
        why: "This turns an abstract worry into a use case. It gives the customer a place to start and tells you where to take the conversation next."
      },
      {
        text: "Which model are you thinking of using?",
        score: 1,
        why: "Reasonable if the customer is already technical. Most executives under investor pressure haven't got that far, and the question can make them feel behind."
      }
    ]
  },

  zones: [
    {
      id: "back",
      name: "Back office",
      who: "Internal operations: IT, HR, finance operations, document handling.",
      examples: [
        "Answering employee questions from internal policies and wikis",
        "Drafting and summarizing internal documents",
        "Sorting and routing tickets and requests"
      ],
      risk: "Lower outside risk. A good place to prove value quickly.",
      ask: "Which repetitive internal process costs your team the most hours each week?"
    },
    {
      id: "middle",
      name: "Middle office",
      who: "Teams that review, decide, and control: risk, compliance, underwriting, procurement, analytics.",
      examples: [
        "Summarizing long contracts, filings, or reports before review",
        "Flagging items that need a human decision",
        "Pulling answers out of large sets of documents"
      ],
      risk: "Accuracy and traceability matter. Keep a person in the loop.",
      ask: "Where do your analysts or reviewers spend hours reading before they can make a decision?"
    },
    {
      id: "front",
      name: "Customer-facing",
      who: "Anything a customer sees or touches: support, sales assistance, product features.",
      examples: [
        "Support assistants that answer customer questions",
        "Features inside the customer's own product",
        "Personalized recommendations or messages"
      ],
      risk: "Highest visibility. Quality, safety, and brand risk are all in play, so plan testing and guardrails early.",
      ask: "Where would a faster or better answer change what your own customers experience?"
    }
  ],

  sort: [
    {
      id: "s1",
      text: "\"We spend weeks reading supplier contracts before we can approve them.\"",
      answer: "middle",
      why: "Reviewing documents to support a decision is middle office work."
    },
    {
      id: "s2",
      text: "\"Our customers wait too long for answers from support.\"",
      answer: "front",
      why: "The customer feels this directly, so this is customer-facing."
    },
    {
      id: "s3",
      text: "\"New hires can't find answers in our HR policy documents.\"",
      answer: "back",
      why: "An internal helper for employees is back office, usually the lowest-risk place to begin."
    }
  ],

  criteria: [
    { name: "Task fit", what: "Is the model good at the job: summarizing, writing, extracting, reasoning, code?", ask: "What should the model do, and what does a good answer look like?" },
    { name: "Speed", what: "How fast must it respond: instantly in a chat, or minutes in a batch job?", ask: "Is a person waiting on this answer?" },
    { name: "Cost", what: "What will it cost at real volume, not demo volume?", ask: "How many requests a day, and how long are the inputs and outputs?" },
    { name: "Context size", what: "How much information has to fit in a single request?", ask: "Are we working with a paragraph, or a 200-page document?" },
    { name: "Input types", what: "Text only, or images and scanned documents too?", ask: "What does the raw material look like today?" },
    { name: "Data and privacy", what: "What data is involved, and what must stay protected?", ask: "Who reviews security for this, and what will they ask?" },
    { name: "Customization and grounding", what: "Does it need the customer's own knowledge, or a particular style or behavior?", ask: "Where does the right answer live today?" }
  ],

  planner: [
    {
      id: "priority",
      q: "What matters most to the customer for this use case?",
      opts: [
        ["speed", "Fast, low-cost answers at high volume"],
        ["depth", "The highest-quality reasoning, even if slower or pricier"],
        ["balance", "A balance of both"]
      ]
    },
    {
      id: "docs",
      q: "Do answers need to come from the customer's own documents or data?",
      opts: [["yes", "Yes"], ["no", "No"]]
    },
    {
      id: "sensitive",
      q: "Does the data include sensitive or regulated information?",
      opts: [["yes", "Yes"], ["no", "No"]]
    },
    {
      id: "media",
      q: "Does the input include more than text, like images or scanned documents?",
      opts: [["yes", "Yes"], ["no", "No"]]
    }
  ],

  scenarios: [
    {
      id: "founder",
      title: "The technical founder",
      setup: "Dana is the CTO of a 20-person startup building a support assistant. The team already calls another provider's API. Dana says: \"Why would I move to Bedrock?\"",
      n1: {
        prompt: "How do you respond?",
        options: [
          { text: "Bedrock has more features than most providers. Let me walk you through the list.", score: 0, why: "A feature tour loses technical buyers. Start with their workload, not your catalog." },
          { text: "What does the assistant do today, and where does it hurt: cost, speed, quality, or security reviews from your own customers?", score: 2, why: "You diagnose before you pitch, and you give Dana four doors to walk through." },
          { text: "Many startups like having several model providers behind one API. Is switching models something you'd want?", score: 1, why: "Relevant, but it's still your idea of the value. Ask about their need first." }
        ]
      },
      n2: {
        prompt: "Dana: \"Our enterprise customers keep asking where their data goes. And we've outgrown one model: it's too slow for chat and too expensive for summaries.\"",
        options: [
          { text: "That sounds like two jobs. Let's test a faster model for chat and a different one for summaries, and I'll bring in a solutions architect to walk through data handling with the documentation your customers' security teams will ask for.", score: 2, why: "You heard two problems, proposed a test, and routed the data question to the right person with real documentation." },
          { text: "Don't worry about data. It's all secure.", score: 0, why: "Vague reassurance damages trust with a technical buyer. Point to current documentation and a specialist." },
          { text: "Let me send you a pricing comparison.", score: 1, why: "Cost matters, but you skipped the insight that this is two different jobs." }
        ]
      },
      takeaway: "Technical buyers want you to understand the workload first. Bring in a specialist for anything that needs depth."
    },
    {
      id: "exec",
      title: "The executive under investor pressure",
      setup: "Marcus is the COO of a mid-size company owned by a private equity firm. He says: \"My sponsors want an AI plan by next quarter. I don't want a science project.\"",
      n1: {
        prompt: "How do you respond?",
        options: [
          { text: "Let's find one process where a better answer saves real time or money, and prove it in weeks. Which team loses the most hours to repetitive reading or writing?", score: 2, why: "You take his words seriously: no science project, a small proof, tied to a business outcome." },
          { text: "Everyone is doing this, and the risk is falling behind. We should talk about a company-wide strategy.", score: 0, why: "Fear of falling behind is the pressure he already feels. A company-wide strategy is the science project he wants to avoid." },
          { text: "Our customers see good results with chatbots. Have you thought about a chatbot?", score: 1, why: "A starting idea, but you led with a solution before understanding his problem." }
        ]
      },
      n2: {
        prompt: "Marcus: \"Support is our biggest cost center. How do I know it'll pay off, and what's it going to cost?\"",
        options: [
          { text: "Let's define success first: handling time, resolution rate, quality. A small pilot gives you real numbers instead of estimates. I'll bring in a specialist to scope it and explain what drives cost.", score: 2, why: "Success measures first, a pilot for evidence, and an honest handoff on cost drivers." },
          { text: "Most customers see big savings.", score: 0, why: "An unsupported claim. He'll repeat it to his sponsors, and you can't back it up." },
          { text: "Let me get you a link to a cost calculator.", score: 1, why: "Helpful, but it isn't tied to a definition of success, so the number won't mean much." }
        ]
      },
      takeaway: "Executives need a small, measurable first step and an honest account of cost. Never hand them a claim you can't support."
    },
    {
      id: "capacity",
      title: "The capacity-constrained launch",
      setup: "Priya is VP of Engineering at a fast-growing startup. She says: \"We launch in four weeks. Testing hit throughput limits on the model we picked. Can you guarantee capacity?\"",
      n1: {
        prompt: "How do you respond?",
        options: [
          { text: "I'll make sure you get what you need.", score: 0, why: "You can't guarantee that. A promise you can't keep is worse than a straight answer." },
          { text: "I can't promise capacity and I won't guess. Help me understand your expected load: requests per minute, how long the responses are, and which regions. Then I'll bring in the right people today.", score: 2, why: "Honest, specific, and it moves fast. You gather the facts that specialists will need." },
          { text: "Have you tried requesting a quota increase?", score: 1, why: "Useful, but it jumps to a fix before you understand the load, and it can sound like a brush-off." }
        ]
      },
      n2: {
        prompt: "Priya: \"We expect a spike at launch, and we'd rather not be down.\"",
        options: [
          { text: "Let's plan around it: size the peak, review the options for handling spikes with a specialist (quota requests, other regions, a second model as backup, a phased rollout), and set a check-in date so you're not waiting on me.", score: 2, why: "A plan with options and a date. You commit to the process, not to an outcome you don't control." },
          { text: "Maybe delay the launch until capacity improves.", score: 1, why: "Sometimes right, but it's passive. Explore the options first." },
          { text: "Capacity should be fine by then.", score: 0, why: "A guess presented as a fact. Don't predict availability or give timelines you can't back up." }
        ]
      },
      takeaway: "When supply is limited, be honest, gather the load facts, use the escalation path early, and give a date for the next update."
    }
  ],

  quiz: [
    {
      q: "A customer says, \"We need an AI plan.\" What is the best first move?",
      opts: [
        { text: "Ask about a process or customer moment they want to improve", correct: true },
        { text: "Recommend the most capable model available", correct: false },
        { text: "Offer a platform demo", correct: false }
      ],
      why: "Start from a use case. Models and demos come after you know what the customer is trying to get done."
    },
    {
      q: "An AI assistant that chats directly with a company's customers belongs in which zone?",
      opts: [
        { text: "Back office", correct: false },
        { text: "Middle office", correct: false },
        { text: "Customer-facing", correct: true }
      ],
      why: "Customers see it directly, so quality, safety, and brand risk are highest. Plan testing and guardrails early."
    },
    {
      q: "Which of these is NOT one of the seven selection criteria?",
      opts: [
        { text: "Speed", correct: false },
        { text: "Which model got the most press this month", correct: true },
        { text: "Data and privacy", correct: false }
      ],
      why: "Selection comes from the customer's needs: task fit, speed, cost, context size, input types, data and privacy, and customization."
    },
    {
      q: "A customer asks you to guarantee capacity for their launch. What do you do?",
      opts: [
        { text: "Reassure them it will be fine", correct: false },
        { text: "Be honest, gather the load facts, bring in specialists, and plan the options with a check-in date", correct: true },
        { text: "Tell them to wait until things improve", correct: false }
      ],
      why: "Don't promise what you can't control. A clear process with a next date builds trust."
    },
    {
      q: "Who settles the final model choice?",
      opts: [
        { text: "The seller, based on the model's reputation", correct: false },
        { text: "Test results on the customer's own examples, with a solutions architect's help", correct: true },
        { text: "Whichever model is cheapest", correct: false }
      ],
      why: "A model choice is a test result, not a sales claim."
    }
  ],

  jobaid: {
    title: "Job aid: talking Bedrock with customers",
    zones: "Three zones, three first questions",
    capacityTitle: "When capacity is the issue",
    capacity: [
      "Say plainly that you can't promise capacity or dates.",
      "Ask for the facts: expected requests per minute, response length, regions, launch date.",
      "Use the escalation path today, not next week.",
      "Walk through options with a specialist: quota requests, other regions, a backup model, a phased rollout.",
      "Agree on a check-in date and keep it."
    ],
    rule: "A model choice is a test result, not a sales claim."
  }
};
