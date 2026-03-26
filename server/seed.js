import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DB_PATH = path.join(ROOT_DIR, 'gameforge.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// ---------- helper ----------
const stmt = db.prepare(
  'INSERT INTO entities (id, entity_type, data, created_date, updated_date) VALUES (?, ?, ?, ?, ?)',
);
const upsertUser = db.prepare(
  'INSERT INTO users (email, full_name, created_date) VALUES (?, ?, ?) ON CONFLICT(email) DO UPDATE SET full_name = excluded.full_name',
);

function insert(entityType, data) {
  const id = uuidv4();
  const now = new Date().toISOString();
  stmt.run(id, entityType, JSON.stringify({ ...data, id }), now, now);
  return id;
}

function insertAt(entityType, data, dateStr) {
  const id = uuidv4();
  const d = new Date(dateStr).toISOString();
  stmt.run(id, entityType, JSON.stringify({ ...data, id }), d, d);
  return id;
}

// ---------- seed everything in a transaction ----------
const seed = db.transaction(() => {
  // ===== PROJECT =====
  const projectId = insert('Project', {
    name: 'Ruševine',
    description: 'Možda',
    invite_code: 'BX0VBM',
    owner_email: 'tomekmaleni@gmail.com',
  });
  console.log('Project:', projectId);

  // ===== USERS + MEMBERS =====
  const members = [
    { name: 'Tomislav Matoković', email: 'tomekmaleni@gmail.com', role: 'admin' },
    { name: 'Ying Yang', email: 'shadowmaster1705@gmail.com', role: 'editor' },
    { name: 'Matkoosymous W', email: 'matko.vasovic@gmail.com', role: 'editor' },
    { name: 'Jakov Vehar Kocačić Augustin', email: 'jakov.vehar@gmail.com', role: 'editor' },
    { name: 'Vladislav Groza', email: 'womir0706@gmail.com', role: 'editor' },
    { name: 'Filip Tomić', email: 'f.tomic1801@gmail.com', role: 'admin' },
  ];

  const memberIds = {};
  const now = new Date().toISOString();
  for (const m of members) {
    upsertUser.run(m.email, m.name, now);
    memberIds[m.email] = insert('ProjectMember', {
      project_id: projectId,
      user_email: m.email,
      user_name: m.name,
      role: m.role,
    });
  }
  console.log('Members:', Object.keys(memberIds).length);

  // ===== FOLDERS =====
  const folderNames = ['Frakcije', 'Artefakti', 'Map', 'Mechanics', 'Lore', 'Dizajn', 'Čudovišta', 'Playtesting'];
  const folderIds = {};
  folderNames.forEach((name, i) => {
    folderIds[name] = insert('Folder', {
      project_id: projectId,
      name,
      order: i,
    });
  });
  console.log('Folders:', Object.keys(folderIds).length);

  // ===== GAME CATEGORIES =====
  const categoryNames = ['Polja', 'Zapovjednici', 'Event', 'Trofeji', 'Čudovišta', 'Relikvije', 'Artefakti', 'Frakcije', 'Blago'];
  const defaultFields = [
    { name: 'Type', type: 'text' },
    { name: 'Ability', type: 'textarea' },
    { name: 'Lore', type: 'textarea' },
  ];
  const categoryIds = {};
  for (const name of categoryNames) {
    categoryIds[name] = insert('GameCategory', {
      project_id: projectId,
      name,
      fields: defaultFields,
    });
  }
  console.log('Categories:', Object.keys(categoryIds).length);

  // ===== MECHANICS =====
  const mechanicNames = [
    'Block action', 'Force action', 'Štit', 'Uništavanje artefakata',
    'Regrutiranje', 'Borba s Demonima', 'Otkrivanje Polja', 'Pročišćenje',
    'Traženje Relikvija', 'Predviđanje', 'Combat', 'Healing', 'Movement',
  ];
  const mechanicIds = {};
  for (const name of mechanicNames) {
    mechanicIds[name] = insert('Mechanic', {
      project_id: projectId,
      name,
    });
  }
  console.log('Mechanics:', Object.keys(mechanicIds).length);

  // ===== HELPER: resolve mechanic names to IDs =====
  function resolveMechanics(names) {
    return names.map(n => {
      const id = mechanicIds[n];
      if (!id) console.warn(`  WARNING: mechanic "${n}" not found`);
      return id;
    }).filter(Boolean);
  }

  // ===== GAME ENTRIES =====
  const entries = [
    // --- Artefakti ---
    { cat: 'Artefakti', name: 'Blagoslovljeni Štit Prvog Svitanja', data: { Type: 'Početni - Odred minulog sunca' }, mechanics: ['Combat', 'Štit'], tags: ['artefakti', 'odred minulog sunca'] },
    { cat: 'Artefakti', name: 'Sunčev Disk', data: { Type: 'Otkrivanje Polja' }, mechanics: [], tags: ['artefakti'] },
    { cat: 'Artefakti', name: 'Hvatač Demona', data: {}, mechanics: [], tags: ['artefakti'] },
    { cat: 'Artefakti', name: 'Transdimenzionalni Bodež', data: {}, mechanics: ['Movement'], tags: ['artefakti'] },
    { cat: 'Artefakti', name: 'Demon u Ćupu', data: {}, mechanics: ['Combat', 'Uništavanje artefakata'], tags: ['artefakti'] },
    { cat: 'Artefakti', name: 'Al-Zarova Lubanja', data: {}, mechanics: ['Combat', 'Borba s Demonima'], tags: ['artefakti'] },
    { cat: 'Artefakti', name: 'Knjiga Imena', data: {}, mechanics: ['Borba s Demonima'], tags: ['artefakti'] },
    { cat: 'Artefakti', name: 'Lažni General', data: {}, mechanics: ['Combat'], tags: ['artefakti'] },
    { cat: 'Artefakti', name: 'Durbin', data: { Type: 'Početni - Posljednja ekspedicija' }, mechanics: ['Otkrivanje Polja'], tags: ['artefakti', 'posljednja ekspedicija'] },
    { cat: 'Artefakti', name: 'Oprema za penjanje', data: { Type: 'Početni - Posljednja ekspedicija' }, mechanics: ['Movement'], tags: ['artefakti', 'posljednja ekspedicija'] },
    { cat: 'Artefakti', name: 'Drevni Kompas', data: { Type: 'Početni - Posljednja ekspedicija' }, mechanics: [], tags: ['artefakti', 'posljednja ekspedicija'] },
    { cat: 'Artefakti', name: 'Mistična Kutija', data: { Type: 'Početni - Gilda' }, mechanics: [], tags: ['artefakti', 'gilda'] },
    { cat: 'Artefakti', name: 'Ratni Planovi', data: { Type: 'Početni - Legija' }, mechanics: ['Movement'], tags: ['artefakti', 'legija'] },
    { cat: 'Artefakti', name: 'Legijin Pečat', data: { Type: 'Početni - Legija' }, mechanics: ['Regrutiranje'], tags: ['artefakti', 'legija'] },
    { cat: 'Artefakti', name: 'Zastava V. Legije', data: { Type: 'Početni - Legija' }, mechanics: ['Combat', 'Štit'], tags: ['artefakti', 'legija'] },
    { cat: 'Artefakti', name: 'Iskrivljena statua', data: {}, mechanics: [], tags: ['artefakti'] },
    { cat: 'Artefakti', name: 'Sveta voda', data: { Type: 'Početni - Odred minulog sunca' }, mechanics: ['Traženje Relikvija'], tags: ['artefakti', 'odred minulog sunca'] },
    { cat: 'Artefakti', name: 'Biljna medicina', data: { Type: 'Početni - Lovci na čudovišta' }, mechanics: ['Healing', 'Combat'], tags: ['artefakti', 'lovci na čudovišta'] },
    { cat: 'Artefakti', name: 'Priručnik o lovu na čudovišta', data: { Type: 'Početni - Lovci na čudovišta' }, mechanics: ['Combat'], tags: ['artefakti', 'lovci na čudovišta'] },
    { cat: 'Artefakti', name: 'Lovački rog', data: { Type: 'Početni - Lovci na čudovišta' }, mechanics: ['Force action'], tags: ['artefakti', 'lovci na čudovišta'] },
    { cat: 'Artefakti', name: 'Baldwinova maska', data: {}, mechanics: ['Block action'], tags: ['artefakti'] },
    { cat: 'Artefakti', name: 'Triglav nordarski', data: {}, mechanics: [], tags: ['artefakti'] },

    // --- Relikvije ---
    { cat: 'Relikvije', name: 'Yarino Stopalo', data: { Type: 'Relikvija' }, mechanics: ['Movement'], tags: ['relikvija', 'odred minulog sunca'] },
    { cat: 'Relikvije', name: 'Ithanova Pluća', data: { Type: 'Relikvija' }, mechanics: ['Pročišćenje'], tags: ['relikvija', 'odred minulog sunca'] },
    { cat: 'Relikvije', name: 'Egelijino Oko', data: { Type: 'Relikvija' }, mechanics: ['Predviđanje'], tags: ['relikvija', 'odred minulog sunca'] },
    { cat: 'Relikvije', name: 'Dunirov Prst', data: { Type: 'Relikvija' }, mechanics: ['Force action', 'Movement'], tags: ['relikvija', 'odred minulog sunca'] },
    { cat: 'Relikvije', name: 'Averinovo Srce', data: { Type: 'Relikvija' }, mechanics: ['Healing'], tags: ['odred minulog sunca', 'relikvija'] },

    // --- Zapovjednici ---
    { cat: 'Zapovjednici', name: 'Pontifex Maximus', data: {}, mechanics: ['Combat', 'Štit'], tags: ['zapovjednik', 'general', 'odred minulog sunca'] },
    { cat: 'Zapovjednici', name: 'Inkvizitor', data: {}, mechanics: [], tags: ['čudovište', 'hereza crne vrane', 'elitna'] },

    // --- Polja ---
    { cat: 'Polja', name: 'Skretanje2', data: {}, mechanics: [], tags: ['polje', 'skretanje'] },
    { cat: 'Polja', name: 'Skretanje1', data: {}, mechanics: [], tags: ['polje', 'skretanje'] },

    // --- Trofeji ---
    { cat: 'Trofeji', name: 'Valmarske Kosti', data: {}, mechanics: [], tags: ['trofej'] },
    { cat: 'Trofeji', name: 'Očnjak', data: {}, mechanics: [], tags: ['trofej'] },

    // --- Frakcije ---
    { cat: 'Frakcije', name: 'Posljednja Ekspedicija', data: {}, mechanics: ['Predviđanje'], tags: ['frakcija'] },
    { cat: 'Frakcije', name: 'Gilda', data: {}, mechanics: [], tags: ['frakcije'] },
    { cat: 'Frakcije', name: 'Odred Minulog Sunca', data: {}, mechanics: [], tags: ['frakcije'] },
    { cat: 'Frakcije', name: 'Lovci na Čudovišta', data: {}, mechanics: [], tags: ['frakcije'] },
    { cat: 'Frakcije', name: 'Legija', data: {}, mechanics: [], tags: ['frakcije'] },

    // --- Blago ---
    { cat: 'Blago', name: 'Karhedonski zlatnici', data: {}, mechanics: [], tags: ['blago'] },
  ];

  let entryCount = 0;
  for (const e of entries) {
    insert('GameEntry', {
      project_id: projectId,
      category_id: categoryIds[e.cat],
      name: e.name,
      data: e.data || {},
      mechanic_ids: resolveMechanics(e.mechanics),
      tags: e.tags,
    });
    entryCount++;
  }
  console.log('Game Entries:', entryCount);

  // ===== IDEAS =====
  // Use member emails for likes/dislikes placeholders
  const likeEmails = [
    'tomekmaleni@gmail.com',
    'shadowmaster1705@gmail.com',
    'matko.vasovic@gmail.com',
    'jakov.vehar@gmail.com',
  ];

  const ideas = [
    {
      title: 'Borbeni probijač ( artefakt )',
      description: 'Mali ratni ovan probijač, koji može nositi jedna osoba, napravljen od sivkastog drva metalnih djelova i velike metalne lubanje sa ovnovskim rogovima na vrhu. Efekt- u borbi uništava 1 štit (?), ako u borbu...',
      status: 'not_started', likes: [], dislikes: [],
    },
    {
      title: 'Sijač Ratova ( artefakt)',
      description: 'Ogromni drevni bubanj, Gilda pretpostavlja da je izrađen u prvom dobu poslije Velkog Pada. Izrađen od jednostavnih materijala sa crvenim spiralnim ukrasima po sebi, te dvije privezane velike kosti, koji...',
      status: 'not_started', likes: [], dislikes: [],
    },
    {
      title: 'Kruna utišane vlasti ( artefakt)',
      description: 'Artefakt (ili nešto drugo) koji poništava moć generala vojske protiv koje se boriš Nakon mnogih pobijeđenih bitaka, general se uvjerio da je kralj, od nedavno nitko mu više ne vjeruje. Vodi li nas ovo ...',
      status: 'not_started', likes: [likeEmails[0]], dislikes: [],
    },
    {
      title: '?',
      description: 'One use artefakt, koji ti omogućuje da oživiš neki uništeni artefakt, mislio sam nekl kameni totem ili tak neš, ili neki drevni oblik koji vibrira',
      status: 'not_started', likes: [likeEmails[0], likeEmails[1]], dislikes: [],
    },
    {
      title: '?',
      description: 'Neki artefakt koji ti omogućuje da se teleportiraš od jedne do druge rupe na mapi ( naravno izbalansirano), mislio sam možda ili neki ogrtač tamni ili možda neki jako teški predmet, pa te kao...',
      status: 'not_started', likes: [likeEmails[0]], dislikes: [],
    },
    {
      title: 'One... One su žive ( Event)',
      description: 'Ruševine su nekada davno bile napravljene s nekom svrhom, no možemo samo nagađati koja je ona bila. Kako god bilo ruševine još uvijek djeluju, one su žive. Efekt- Prva tri kruga polja oko Kapitolija se...',
      status: 'not_started', likes: [likeEmails[0], likeEmails[1], likeEmails[2], likeEmails[3]], dislikes: [],
    },
    {
      title: 'Sveti Rat ( Event/Odred)',
      description: 'Event: Trajanje- 1 r. Lore- I Sunce mu se objavilo, reklo je prinesite mi ih u molitvi ili u pepelu... Knjiga Odmazde 12, 4 Efekt- Odred dobija mali bonus u borbi i dobijaju pare za svaku ubijenu trupu, ako ih...',
      status: 'not_started', likes: [likeEmails[0], likeEmails[1], likeEmails[2]], dislikes: [],
    },
    {
      title: 'Yarino Stopalo ( relikvija )',
      description: 'Yara je bila jedna od prvih hodočasnica, iz dana u dan je hodala i hodala, uvijek s brojanicom u ruci i jednostavnim sandalama na stopalima. Hodala je i hodala, od svetišta do svetišta uvijek moleći. Njezi...',
      status: 'not_started', likes: [likeEmails[0], likeEmails[1]], dislikes: [],
    },
    {
      title: 'Ithanova (?) Pluća (relikvija)',
      description: 'Ithan je bio svetac koji je za vrijeme požara u njegovom gradu molio u kapeli za otkupljenje ljudi u gradu, kako je kapela počela gorjeti, miomirisi su se zapalili, Ithan je udisao dim i miomirise, nastavljući...',
      status: 'finished', likes: [likeEmails[0], likeEmails[1]], dislikes: [],
    },
    {
      title: 'Ritualne žrtve (čudovište/Hereza Crne Vrane/Običn)',
      description: 'Basic encounter, ili samo niske statistike ili druga ideja, oni su samo mamac, izvlačiš dodatni HCV encounter',
      status: 'not_started', likes: [likeEmails[0], likeEmails[1]], dislikes: [],
    },
    {
      title: 'Prorok ( čudovište/ Hereza Crne Vrane/Legenda)',
      description: 'Neki dost jaki encounter, ako ga ne ubiješ dovoljno brzo ima "Proročanstvo/Viziju" koja se ispuni i odmah otvoriš sljedeću event kartu i izvršiš efekte. Uz to može imat neki pasiv možda, kjznm...',
      status: 'not_started', likes: [likeEmails[0], likeEmails[1]], dislikes: [],
    },
  ];

  for (const idea of ideas) {
    insert('Idea', {
      project_id: projectId,
      title: idea.title,
      description: idea.description,
      status: idea.status,
      likes: idea.likes,
      dislikes: idea.dislikes,
    });
  }
  console.log('Ideas:', ideas.length);

  // ===== TASKS =====
  insert('Task', {
    project_id: projectId,
    title: 'Isprintati figurice',
    description: '',
    status: 'in_progress',
    priority: 'medium',
    assignee_email: 'jakov.vehar@gmail.com',
    assignee_name: 'Jakov Vehar Kocačić Augustin',
  });
  console.log('Tasks: 1');

  // ===== PLAYTESTING =====
  insert('PlaytestSession', {
    project_id: projectId,
    session_date: '2026-01-18',
    players: 'Ja, Ti, On, ona, oni',
    notes: 'Ja - Legija  (Dobio)\nTi - Monster Hunter\nOn - Odred minulog sunca\nOna - Gil...\nOni - ......',
    what_worked: 'Movement\nLore\nRelikvije',
    what_needs_work: 'Combat\nArtefakti\nGenerali',
  });
  console.log('Playtest Sessions: 1');

  // ===== CHAT MESSAGES =====
  // Dizajn folder
  insertAt('ChatMessage', {
    project_id: projectId,
    folder_id: folderIds['Dizajn'],
    sender_email: 'womir0706@gmail.com',
    sender_name: 'Vladislav Groza',
    content: 'Eo, prve figure su isprintane',
  }, '2026-03-15T07:03:00');

  insertAt('ChatMessage', {
    project_id: projectId,
    folder_id: folderIds['Dizajn'],
    sender_email: 'womir0706@gmail.com',
    sender_name: 'Vladislav Groza',
    content: 'Kaj mislite o dizajnu,ovog zelota ( lijevo) mislim mjenjat, produžit mu noge i povećat glavu',
  }, '2026-03-15T07:10:00');

  // Playtesting folder
  insertAt('ChatMessage', {
    project_id: projectId,
    folder_id: folderIds['Playtesting'],
    sender_email: 'jakov.vehar@gmail.com',
    sender_name: 'Jakov Vehar Kocačić Augustin',
    content: 'kkkkl',
  }, '2026-03-14T22:06:00');

  console.log('Chat Messages: 3');
});

// Run the seed
seed();
console.log('\nSeed complete!');
db.close();
