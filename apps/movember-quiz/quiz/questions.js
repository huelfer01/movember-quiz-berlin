/* Edit questions here. `answer` is the zero-based index of the correct option.
   Health guidance and statistics checked 12 November 2026.
   Age recommendations and statistics explicitly refer to Germany. */
window.QUIZ_QUESTIONS = [
  {
    topic: 'Prostate health · Germany',
    question: 'From what age do German guidelines recommend discussing PSA-based prostate cancer screening for men at average risk?',
    options: ['40 years', '45 years', '50 years', '55 years'],
    answer: 1,
    explanation: 'Discuss benefits and harms from 45; some inherited risks warrant starting earlier. Screening is a personal decision. Get symptoms checked at any age.',
    source: 'https://www.krebsinformationsdienst.de/prostatakrebs/frueherkennung',
    sourceLabel: 'DKFZ: prostate cancer screening (German)'
  },
  {
    topic: 'Understand the test',
    question: 'A PSA blood test comes back elevated. What does that result tell you?',
    options: [
      'It confirms prostate cancer, but not its stage',
      'It identifies how quickly a prostate tumour is growing',
      'It rules out a benign enlargement of the prostate',
      'It needs assessment; benign conditions can also raise PSA'
    ],
    answer: 3,
    explanation: 'Benign enlargement, inflammation and infection can raise PSA too. An elevated result is not a diagnosis; a doctor decides whether to repeat the test or investigate.',
    source: 'https://movember.com/articles/about-prostate-cancer',
    sourceLabel: 'Movember: PSA and prostate cancer'
  },
  {
    topic: 'Testicular health · Germany',
    question: 'In which age range do most testicular cancer cases occur in Germany?',
    options: ['25–45 years', '45–65 years', '65–85 years', '5–25 years'],
    answer: 0,
    explanation: 'Most cases occur between 25 and 45, according to the Robert Koch Institute. It can occur at other ages too. Get familiar with your normal.',
    source: 'https://edoc.rki.de/bitstream/handle/176904/13155/krebs_in_deutschland_2025.pdf',
    sourceLabel: 'RKI: Cancer in Germany, testicular cancer chapter (German PDF)'
  },
  {
    topic: 'Notice a change',
    question: 'You find a new lump in a testicle, but it does not hurt. What is the best next step?',
    options: [
      'Monitor it for a month before booking',
      'Mention it at your next annual check-up',
      'Book a medical appointment promptly, even without pain',
      'Book if it becomes painful or grows'
    ],
    answer: 2,
    explanation: 'Testicular cancer can cause painless lumps or swelling. Get new changes checked promptly; do not wait for pain. Many changes have other causes.',
    source: 'https://www.krebsinformationsdienst.de/hodenkrebs',
    sourceLabel: 'DKFZ: testicular cancer symptoms (German)'
  },
  {
    topic: 'Mental health · Germany, 2025',
    question: 'Approximately what share of people who died by suicide in Germany in 2025 were men?',
    options: ['About 50%', 'About 60%', 'About 70%', 'About 80%'],
    answer: 2,
    explanation: 'Destatis reports 69.2% for Germany in 2025. This measures deaths, not attempts. Reaching out and helping someone find support can matter.',
    source: 'https://www.destatis.de/DE/Themen/Gesellschaft-Umwelt/Gesundheit/Todesursachen/Tabellen/suizide.html',
    sourceLabel: 'Destatis: suicide deaths, Germany 2025 (German)'
  },
  {
    topic: 'Famous facial hair',
    question: 'Whose Mo is this?',
    image: 'assets/nick-offerman.jpg',
    imageAlt: 'A close-up portrait of a celebrity with a thick moustache',
    imageCredit: 'Photo: UMBC Student Events Board / CC BY 2.0',
    imageCreditUrl: 'https://commons.wikimedia.org/wiki/File:Nick_Offerman_2013_Headshot_(cropped).jpg',
    options: ['Tom Selleck', 'Nick Offerman', 'Burt Reynolds', 'Freddie Mercury'],
    answer: 1,
    explanation: 'It is Nick Offerman, the actor behind Ron Swanson in Parks and Recreation. Movember welcomed him as a Mo Mentor, using his iconic facial hair to encourage first-time growers.',
    source: 'https://us.movember.com/story/view/id/4417/mo-mentor-nick-offerman',
    sourceLabel: 'Movember: Mo Mentor Nick Offerman'
  },
  {
    topic: 'Mental health · Germany',
    question: 'If someone in Germany needs professional help for a mental health problem, where can they start?',
    options: [
      'Wait until the problem becomes an emergency',
      'Only go to a hospital emergency department',
      'Contact a GP or psychotherapist; 116117 can also guide you',
      'Ask an employer to choose a therapist'
    ],
    answer: 2,
    explanation: 'A GP practice or psychotherapist can be a first point of contact. The medical service at 116117 can help outside normal hours. In immediate danger, call 112.',
    source: 'https://gesund.bund.de/wege-im-gesundheitswesen/erwachsenenleben/psychische-gesundheit/anlaufstellen-bei-psychischen-krisen',
    sourceLabel: 'gesund.bund.de: help in a mental health crisis (German)'
  },
  {
    topic: 'The bigger picture',
    question: 'About how many years earlier do men die than women on average?',
    options: ['2 years', '5 years', '8 years', '10 years'],
    answer: 1,
    explanation: 'About five years. Movember highlights that men are dying younger, often for largely preventable reasons — a gap the movement wants to close.',
    source: 'https://movember.com/uploads/files/Fundraising-Resources/Movember%20-%20Workplace%20Communications%20Guide.pdf',
    sourceLabel: 'Movember: Workplace Communications Guide (PDF)'
  },
  {
    topic: 'Ask directly · Suicide prevention',
    question: 'You worry a friend is thinking about suicide. Which approach is recommended?',
    options: [
      'Ask about stress; let them introduce suicide',
      'Reassure them they have reasons to keep going',
      'Ask calmly and directly about suicidal thoughts',
      'Arrange another conversation when their mood improves'
    ],
    answer: 2,
    explanation: 'Asking directly does not increase suicidal thoughts. Listen and help them connect with support. In immediate danger, stay with them and contact emergency services.',
    source: 'https://www.who.int/news-room/questions-and-answers/item/suicide',
    sourceLabel: 'WHO: talking about suicide and helping someone'
  },
  {
    topic: 'Mo trivia',
    question: 'On average, how many times a day does a man touch his moustache?',
    options: ['760 times', '220 times', '1,550 times', '40 times'],
    answer: 0,
    explanation: 'Apparently, 760 times a day. That is a lot of hands-on Mo maintenance — and a statistic made for a pub quiz.',
    sourceLabel: 'Movember pub quiz'
  }
];
