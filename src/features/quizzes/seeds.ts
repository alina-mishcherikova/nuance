import { randomUUID } from 'node:crypto';
import {
  quizDocumentSchema,
  type QuizDocument,
} from '../../lib/validation/quiz';
const copy = (en: string, uk: string, fr: string) => ({ en, uk, fr });
const yes = () => [
  { id: randomUUID(), value: 'yes', label: copy('Yes', 'Так', 'Oui') },
  { id: randomUUID(), value: 'no', label: copy('No', 'Ні', 'Non') },
  {
    id: randomUUID(),
    value: 'maybe',
    label: copy('Maybe', 'Можливо', 'Peut-être'),
  },
];
const topics = [
  {
    slug: 'couples',
    name: copy('Couples', 'Пари', 'Couples'),
    title: copy(
      'Small gestures, shared days',
      'Маленькі жести, спільні дні',
      'Petits gestes, journées partagées',
    ),
    description: copy(
      'Notice how you prefer to give attention, plan time together and reconnect after a busy day.',
      'Дослідіть, як ви любите проявляти увагу, планувати час разом і відновлювати зв’язок після напруженого дня.',
      'Explorez vos façons de donner de l’attention, de prévoir du temps ensemble et de vous retrouver après une journée chargée.',
    ),
    prompts: [
      copy(
        'Would you enjoy a weekly evening without phones?',
        'Чи сподобався б вам щотижневий вечір без телефонів?',
        'Aimeriez-vous une soirée hebdomadaire sans téléphone ?',
      ),
      copy(
        'Which gesture makes an ordinary day feel special?',
        'Який жест робить звичайний день особливим?',
        'Quel geste rend une journée ordinaire spéciale ?',
      ),
      copy(
        'Which shared activities would you choose for a quiet weekend?',
        'Які спільні заняття ви обрали б для спокійних вихідних?',
        'Quelles activités à deux choisiriez-vous pour un week-end calme ?',
      ),
      copy(
        'How much do you value planning regular time together? 1 = very little, 5 = very much.',
        'Наскільки ви цінуєте регулярний спільний час? 1 = зовсім мало, 5 = дуже сильно.',
        'Quelle importance accordez-vous à des moments réguliers ensemble ? 1 = très peu, 5 = beaucoup.',
      ),
    ],
    single: [
      copy(
        'A thoughtful message',
        'Турботливе повідомлення',
        'Un message attentionné',
      ),
      copy('Practical help', 'Практична допомога', 'Une aide concrète'),
      copy(
        'Unhurried time together',
        'Час разом без поспіху',
        'Du temps ensemble sans hâte',
      ),
    ],
    multi: [
      copy('Cooking', 'Приготування їжі', 'Cuisiner'),
      copy('Walking', 'Прогулянка', 'Se promener'),
      copy('Watching a film', 'Перегляд фільму', 'Regarder un film'),
    ],
  },
  {
    slug: 'friends',
    name: copy('Friends', 'Друзі', 'Amis'),
    title: copy(
      'Your friendship rhythm',
      'Ритм вашої дружби',
      'Votre rythme d’amitié',
    ),
    description: copy(
      'Explore the invitations, support and everyday contact that help your friendships feel comfortable.',
      'Дослідіть запрошення, підтримку та щоденне спілкування, які роблять вашу дружбу комфортною.',
      'Explorez les invitations, le soutien et les échanges qui rendent vos amitiés agréables.',
    ),
    prompts: [
      copy(
        'Would you welcome an unexpected call from a close friend?',
        'Чи зраділи б ви несподіваному дзвінку близького друга?',
        'Accueilleriez-vous avec plaisir l’appel imprévu d’un ami proche ?',
      ),
      copy(
        'When a friend has a difficult day, what is your first instinct?',
        'Що ви робите насамперед, коли в друга важкий день?',
        'Quand un ami passe une journée difficile, quel est votre premier réflexe ?',
      ),
      copy(
        'Which invitations would you usually enjoy?',
        'Які запрошення вам зазвичай подобаються?',
        'Quelles invitations appréciez-vous généralement ?',
      ),
      copy(
        'How important is regular contact? 1 = very little, 5 = very much.',
        'Наскільки важливе регулярне спілкування? 1 = зовсім мало, 5 = дуже важливе.',
        'Quelle importance a un contact régulier ? 1 = très peu, 5 = beaucoup.',
      ),
    ],
    single: [
      copy('Listen first', 'Спершу вислухати', 'Écouter d’abord'),
      copy(
        'Offer practical help',
        'Запропонувати допомогу',
        'Proposer une aide concrète',
      ),
      copy(
        'Suggest a distraction',
        'Запропонувати відволіктися',
        'Proposer une distraction',
      ),
    ],
    multi: [
      copy('Coffee for two', 'Кава вдвох', 'Un café à deux'),
      copy('A group picnic', 'Груповий пікнік', 'Un pique-nique en groupe'),
      copy('A day trip', 'Одноденна подорож', 'Une excursion'),
    ],
  },
  {
    slug: 'habits',
    name: copy('Habits', 'Звички', 'Habitudes'),
    title: copy(
      'The shape of your day',
      'Форма вашого дня',
      'La forme de votre journée',
    ),
    description: copy(
      'Reflect on routines, rest and the small choices that make your daily life easier.',
      'Поміркуйте про розпорядок, відпочинок і маленькі рішення, які полегшують повсякденне життя.',
      'Réfléchissez aux routines, au repos et aux petits choix qui facilitent votre quotidien.',
    ),
    prompts: [
      copy(
        'Would you try preparing tomorrow’s essentials tonight?',
        'Чи спробували б ви підготувати необхідне на завтра ще ввечері?',
        'Essaieriez-vous de préparer ce soir le nécessaire pour demain ?',
      ),
      copy(
        'What helps you start a day well?',
        'Що допомагає вам добре почати день?',
        'Qu’est-ce qui vous aide à bien commencer la journée ?',
      ),
      copy(
        'Which habits would you like to protect?',
        'Які звички ви хотіли б зберегти?',
        'Quelles habitudes aimeriez-vous préserver ?',
      ),
      copy(
        'How much does a predictable routine help you? 1 = very little, 5 = very much.',
        'Наскільки вам допомагає передбачуваний розпорядок? 1 = зовсім мало, 5 = дуже сильно.',
        'Une routine prévisible vous aide-t-elle ? 1 = très peu, 5 = beaucoup.',
      ),
    ],
    single: [
      copy(
        'A slow breakfast',
        'Неквапливий сніданок',
        'Un petit-déjeuner tranquille',
      ),
      copy('Movement', 'Рух', 'Bouger'),
      copy(
        'A clear task list',
        'Чіткий список справ',
        'Une liste de tâches claire',
      ),
    ],
    multi: [
      copy('Regular sleep', 'Регулярний сон', 'Un sommeil régulier'),
      copy('Time outdoors', 'Час на свіжому повітрі', 'Du temps dehors'),
      copy('Screen breaks', 'Перерви від екранів', 'Des pauses sans écran'),
    ],
  },
  {
    slug: 'values',
    name: copy('Values', 'Цінності', 'Valeurs'),
    title: copy(
      'What deserves your energy?',
      'Що варте ваших зусиль?',
      'Qu’est-ce qui mérite votre énergie ?',
    ),
    description: copy(
      'Consider everyday priorities and the principles you want to bring into your decisions.',
      'Розгляньте щоденні пріоритети та принципи, якими хочете керуватися у своїх рішеннях.',
      'Examinez vos priorités quotidiennes et les principes que vous souhaitez suivre dans vos décisions.',
    ),
    prompts: [
      copy(
        'Would you give up convenience to reduce waste?',
        'Чи відмовилися б ви від зручності заради зменшення відходів?',
        'Renonceriez-vous à une facilité pour réduire les déchets ?',
      ),
      copy(
        'When two commitments compete, what guides you first?',
        'Що вас насамперед спрямовує, коли два зобов’язання суперечать одне одному?',
        'Lorsque deux engagements se concurrencent, qu’est-ce qui vous guide d’abord ?',
      ),
      copy(
        'Which principles would you like to practise more often?',
        'Які принципи ви хотіли б частіше втілювати?',
        'Quels principes aimeriez-vous pratiquer plus souvent ?',
      ),
      copy(
        'How important is acting consistently with your values? 1 = very little, 5 = very much.',
        'Наскільки важливо діяти відповідно до своїх цінностей? 1 = зовсім мало, 5 = дуже важливо.',
        'Quelle importance a la cohérence avec vos valeurs ? 1 = très peu, 5 = beaucoup.',
      ),
    ],
    single: [
      copy('Keeping my promise', 'Дотримання обіцянки', 'Tenir ma promesse'),
      copy(
        'Helping whoever needs me most',
        'Допомога тому, хто найбільше потребує',
        'Aider la personne qui en a le plus besoin',
      ),
      copy(
        'Protecting my limits',
        'Збереження власних меж',
        'Respecter mes limites',
      ),
    ],
    multi: [
      copy('Honesty', 'Чесність', 'Honnêteté'),
      copy('Curiosity', 'Допитливість', 'Curiosité'),
      copy('Generosity', 'Щедрість', 'Générosité'),
    ],
  },
  {
    slug: 'humor',
    name: copy('Humor', 'Гумор', 'Humour'),
    title: copy(
      'What makes you laugh?',
      'Що вас смішить?',
      'Qu’est-ce qui vous fait rire ?',
    ),
    description: copy(
      'Explore your taste in playful stories and jokes, while respecting everyone’s boundaries.',
      'Дослідіть свій смак до веселих історій і жартів, поважаючи межі кожного.',
      'Explorez vos goûts en histoires amusantes et en plaisanteries, en respectant les limites de chacun.',
    ),
    prompts: [
      copy(
        'Would you enjoy a deliberately terrible pun?',
        'Чи сподобався б вам навмисно невдалий каламбур?',
        'Apprécieriez-vous un jeu de mots volontairement mauvais ?',
      ),
      copy(
        'Which kind of comedy do you seek out?',
        'Яку комедію ви зазвичай обираєте?',
        'Quel genre de comédie recherchez-vous ?',
      ),
      copy(
        'Which playful activities sound fun?',
        'Які веселі заняття здаються вам цікавими?',
        'Quelles activités ludiques vous attirent ?',
      ),
      copy(
        'How much do you enjoy absurd humor? 1 = very little, 5 = very much.',
        'Наскільки вам подобається абсурдний гумор? 1 = зовсім мало, 5 = дуже сильно.',
        'Aimez-vous l’humour absurde ? 1 = très peu, 5 = beaucoup.',
      ),
    ],
    single: [
      copy(
        'Observations about everyday life',
        'Спостереження про щоденне життя',
        'Des observations du quotidien',
      ),
      copy('Wordplay', 'Гра слів', 'Des jeux de mots'),
      copy(
        'Unexpected absurdity',
        'Несподіваний абсурд',
        'De l’absurde inattendu',
      ),
    ],
    multi: [
      copy('Improv games', 'Ігри з імпровізацією', 'Des jeux d’improvisation'),
      copy('Funny stories', 'Смішні історії', 'Des histoires drôles'),
      copy('Silly drawings', 'Кумедні малюнки', 'Des dessins farfelus'),
    ],
  },
  {
    slug: 'opinions',
    name: copy('Group opinions', 'Думки в компанії', 'Opinions en groupe'),
    title: copy(
      'A table of different opinions',
      'За столом різних думок',
      'Des opinions autour d’une table',
    ),
    description: copy(
      'Think about shared plans, fair decisions and making space for different opinions. Take this alone for now.',
      'Поміркуйте про спільні плани, справедливі рішення та повагу до різних думок. Поки проходьте наодинці.',
      'Réfléchissez aux projets communs, aux décisions équitables et à la place des avis différents. À faire seul pour le moment.',
    ),
    prompts: [
      copy(
        'Should everyone get a turn choosing the next activity?',
        'Чи варто кожному по черзі обирати наступне заняття?',
        'Chacun devrait-il choisir la prochaine activité à tour de rôle ?',
      ),
      copy(
        'How would you settle a choice of restaurant?',
        'Як би ви вирішили, який ресторан обрати?',
        'Comment choisiriez-vous un restaurant ensemble ?',
      ),
      copy(
        'What helps a group discussion?',
        'Що допомагає груповому обговоренню?',
        'Qu’est-ce qui aide une discussion en groupe ?',
      ),
      copy(
        'How comfortable are you expressing a different opinion? 1 = very little, 5 = very much.',
        'Наскільки вам комфортно висловлювати іншу думку? 1 = зовсім некомфортно, 5 = дуже комфортно.',
        'Êtes-vous à l’aise pour exprimer un avis différent ? 1 = très peu, 5 = beaucoup.',
      ),
    ],
    single: [
      copy(
        'Vote after hearing preferences',
        'Голосувати після обговорення вподобань',
        'Voter après avoir écouté les préférences',
      ),
      copy(
        'Take turns deciding',
        'Вирішувати по черзі',
        'Décider à tour de rôle',
      ),
      copy(
        'Find an option everyone accepts',
        'Знайти прийнятний для всіх варіант',
        'Trouver une option acceptable pour tous',
      ),
    ],
    multi: [
      copy('Time to think', 'Час на роздуми', 'Du temps pour réfléchir'),
      copy('Clear questions', 'Чіткі запитання', 'Des questions claires'),
      copy(
        'Inviting quieter voices',
        'Запрошення тихіших учасників до розмови',
        'Inviter les plus discrets à parler',
      ),
    ],
  },
  {
    slug: 'preferences',
    name: copy('Preferences', 'Уподобання', 'Préférences'),
    title: copy(
      'Your preferred pace',
      'Ваш бажаний темп',
      'Votre rythme préféré',
    ),
    description: copy(
      'Explore how you like to recharge, make plans and spend free time. This is a conversation prompt, not a personality diagnosis.',
      'Дослідіть, як вам подобається відновлювати сили, будувати плани й проводити вільний час. Це привід для розмови, а не діагностика особистості.',
      'Explorez vos façons de vous ressourcer, de prévoir et de passer votre temps libre. Une invitation à discuter, pas un diagnostic de personnalité.',
    ),
    prompts: [
      copy(
        'Would you enjoy a weekend with no fixed plans?',
        'Чи сподобалися б вам вихідні без чітких планів?',
        'Apprécieriez-vous un week-end sans programme fixe ?',
      ),
      copy(
        'After a busy week, what do you choose first?',
        'Що ви насамперед обираєте після напруженого тижня?',
        'Après une semaine chargée, que choisissez-vous d’abord ?',
      ),
      copy(
        'Which settings help you recharge?',
        'Яке оточення допомагає вам відновлювати сили?',
        'Quels cadres vous aident à vous ressourcer ?',
      ),
      copy(
        'How much do you enjoy trying unfamiliar activities? 1 = very little, 5 = very much.',
        'Наскільки вам подобається пробувати незнайомі заняття? 1 = зовсім мало, 5 = дуже сильно.',
        'Aimez-vous essayer des activités inconnues ? 1 = très peu, 5 = beaucoup.',
      ),
    ],
    single: [
      copy('Time alone', 'Час наодинці', 'Du temps seul'),
      copy('One close companion', 'Одна близька людина', 'Une personne proche'),
      copy('A lively gathering', 'Жвава компанія', 'Une réunion animée'),
    ],
    multi: [
      copy('A quiet room', 'Тиха кімната', 'Une pièce calme'),
      copy('A park', 'Парк', 'Un parc'),
      copy('A creative workshop', 'Творча майстерня', 'Un atelier créatif'),
    ],
  },
  {
    slug: 'intimacy',
    name: copy('Intimacy', 'Інтимність', 'Intimité'),
    title: copy(
      'Intimacy, consent and comfort',
      'Інтимність, згода та комфорт',
      'Intimité, consentement et confort',
    ),
    description: copy(
      'For adults 18+: reflect privately on affection, communication and consent. No answer creates an obligation; consent can always change.',
      'Для дорослих 18+: особисто поміркуйте про ніжність, спілкування та згоду. Жодна відповідь не створює зобов’язань; згоду завжди можна змінити.',
      'Pour les adultes de 18 ans et plus : réfléchissez en privé à l’affection, à la communication et au consentement. Aucune réponse ne crée d’obligation ; le consentement peut toujours changer.',
    ),
    prompts: [
      copy(
        'Would you like to discuss boundaries before physical intimacy?',
        'Чи хотіли б ви обговорити межі до фізичної близькості?',
        'Souhaitez-vous discuter des limites avant une intimité physique ?',
      ),
      copy(
        'How would you prefer to communicate a need for a pause?',
        'Як вам зручніше повідомити про потребу в паузі?',
        'Comment préférez-vous exprimer le besoin d’une pause ?',
      ),
      copy(
        'Which conversations help you feel comfortable?',
        'Які розмови допомагають вам почуватися комфортно?',
        'Quelles conversations vous aident à vous sentir à l’aise ?',
      ),
      copy(
        'How important are explicit check-ins about comfort? 1 = very little, 5 = very much.',
        'Наскільки важливі прямі запитання про комфорт? 1 = зовсім мало, 5 = дуже важливі.',
        'Quelle importance ont les échanges explicites sur le confort ? 1 = très peu, 5 = beaucoup.',
      ),
    ],
    single: [
      copy(
        'A direct spoken request',
        'Пряме усне прохання',
        'Une demande verbale directe',
      ),
      copy('An agreed signal', 'Узгоджений сигнал', 'Un signal convenu'),
      copy(
        'A brief check-in conversation',
        'Коротка розмова про самопочуття',
        'Un bref échange sur le ressenti',
      ),
    ],
    multi: [
      copy('Personal boundaries', 'Особисті межі', 'Les limites personnelles'),
      copy(
        'Ways to show affection',
        'Способи прояву ніжності',
        'Les façons d’exprimer l’affection',
      ),
      copy(
        'How to withdraw consent',
        'Як відкликати згоду',
        'Comment retirer son consentement',
      ),
    ],
  },
];
export const seedCategories = topics.map((t) => ({
  slug: t.slug,
  name: t.name,
  adultOnly: t.slug === 'intimacy',
}));
export function seedDocuments(): { slug: string; document: QuizDocument }[] {
  return topics.map((t) => ({
    slug: `official-${t.slug}`,
    document: quizDocumentSchema.parse({
      title: t.title,
      description: t.description,
      category: t.slug,
      tags: ['reflection'],
      adultOnly: t.slug === 'intimacy',
      coverId: null,
      questions: t.prompts.map((prompt, i) => ({
        id: randomUUID(),
        stableId: randomUUID(),
        prompt,
        category: t.slug,
        required: true,
        weight: 1,
        imageId: null,
        type: ['YES_NO_MAYBE', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'SCALE'][i],
        options:
          i === 0
            ? yes()
            : i === 3
              ? []
              : (i === 1 ? t.single : t.multi).map((label, j) => ({
                  id: randomUUID(),
                  value: `option-${j + 1}`,
                  label,
                })),
        ...(i === 2 ? { min: 1, max: 2 } : {}),
      })),
    }),
  }));
}
