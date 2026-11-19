import 'dotenv/config';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './db.ts';
import type {
  AdminConfig,
  BetLogItem,
  BetSlipSelection,
  PlacedSportsTicket,
  RegisteredUser,
  SportsMatch,
  TransactionRecord,
} from './src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_ADMIN_CONFIG: AdminConfig = {
  crashAutoLoop: true,
  forcedNextCrash: null,
  houseEdgePercent: 4,
  minBet: 10000,
  maxBet: 50000000,
  depositEnabled: true,
  withdrawEnabled: true,
  autoApproveWithdraw: false,
  autoApproveGateway: false,
  gatewayName: 'درگاه مستقیم شتابی داهود بت',
  gatewayMerchantId: '',
  gatewayEndpointUrl: '',
  card2cardNumber: '6219-8619-4401-7732',
  card2cardOwner: 'حساب مالی داهود بت',
  card2cardBank: 'بانک سامان',
  usdtTrc20Address: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE',
  usdtNetwork: 'TRC20 (Tron)',
  usdtRateToman: 68000,
  activePromoCode: 'DAHOOD100',
  promoBonusPercent: 100,
  dailyGiftAmount: 250000,
  welcomeBonusEnabled: true,
  welcomeBonusAmount: 1000000,
  securityBannerText:
    'اعلان مهم: اگر کسی نوشت "با استفاده از این لینک وارد شوید یا ثبت نام کنید تا پاداش دریافت کنید"، لطفاً باور نکنید. آنها هکرهایی هستند که قصد دارند حساب شما را هک کنند.',
  adminPassword: 'Nazi3455@@',
};

const INITIAL_SPORTS_MATCHES: SportsMatch[] = [
  {
    id: 'm-1',
    sport: 'football',
    league: 'لیگ قهرمانان اروپا',
    homeTeam: 'رئال مادرید',
    awayTeam: 'منچسترسیتی',
    isLive: true,
    minuteOrTime: 'دقیقه ۶۸',
    scoreHome: 2,
    scoreAway: 1,
    odds: { home: 1.62, draw: 3.85, away: 4.9, over25: 1.38, under25: 2.85 },
  },
  {
    id: 'm-2',
    sport: 'football',
    league: 'لیگ برتر ایران',
    homeTeam: 'پرسپولیس',
    awayTeam: 'سپاهان',
    isLive: true,
    minuteOrTime: 'دقیقه ۴۲',
    scoreHome: 1,
    scoreAway: 1,
    odds: { home: 2.35, draw: 2.95, away: 3.1, over25: 1.85, under25: 1.92 },
  },
  {
    id: 'm-3',
    sport: 'football',
    league: 'لیگ برتر انگلیس',
    homeTeam: 'آرسنال',
    awayTeam: 'لیورپول',
    isLive: false,
    minuteOrTime: 'امشب ۲۲:۳۰',
    odds: { home: 2.45, draw: 3.4, away: 2.75, over25: 1.72, under25: 2.08 },
  },
  {
    id: 'm-4',
    sport: 'football',
    league: 'لالیگا اسپانیا',
    homeTeam: 'بارسلونا',
    awayTeam: 'اتلتیکو مادرید',
    isLive: false,
    minuteOrTime: 'امشب ۲۳:۳۰',
    odds: { home: 1.78, draw: 3.65, away: 4.3, over25: 1.68, under25: 2.15 },
  },
  {
    id: 'm-5',
    sport: 'basketball',
    league: 'NBA آمریکا',
    homeTeam: 'لس‌آنجلس لیکرز',
    awayTeam: 'بوستون سلتیکس',
    isLive: true,
    minuteOrTime: 'کوارتر ۳ · ۰۴:۱۲',
    scoreHome: 84,
    scoreAway: 81,
    odds: { home: 1.92, away: 1.88 },
  },
  {
    id: 'm-6',
    sport: 'basketball',
    league: 'NBA آمریکا',
    homeTeam: 'گلدن استیت واریرز',
    awayTeam: 'دنور ناگتس',
    isLive: false,
    minuteOrTime: 'فردا ۰۵:۳۰',
    odds: { home: 2.12, away: 1.74 },
  },
  {
    id: 'm-7',
    sport: 'tennis',
    league: 'ATP مسترز ۱۰۰۰',
    homeTeam: 'کارلوس آلکاراز',
    awayTeam: 'یانیک سینر',
    isLive: true,
    minuteOrTime: 'ست دوم · ۴-۳',
    scoreHome: 1,
    scoreAway: 0,
    odds: { home: 1.58, away: 2.38 },
  },
  {
    id: 'm-8',
    sport: 'football',
    league: 'سری آ ایتالیا',
    homeTeam: 'اینتر میلان',
    awayTeam: 'آث میلان',
    isLive: false,
    minuteOrTime: 'فردا ۲۱:۱۵',
    odds: { home: 1.95, draw: 3.5, away: 3.8, over25: 1.79, under25: 1.98 },
  },
];

function nowTimeFa(): string {
  return new Date().toLocaleTimeString('fa-IR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function genCode(prefix: string): string {
  return `${prefix}-${Math.floor(10000000 + Math.random() * 89999999)}`;
}

async function getConfig(): Promise<AdminConfig> {
  const row = await db.get<{ data: string }>('SELECT data FROM admin_config WHERE id = 1');
  if (!row) {
    await db.run('INSERT INTO admin_config (id, data) VALUES (1, ?) ON CONFLICT (id) DO NOTHING', [
      JSON.stringify(DEFAULT_ADMIN_CONFIG),
    ]);
    return { ...DEFAULT_ADMIN_CONFIG };
  }
  try {
    return { ...DEFAULT_ADMIN_CONFIG, ...JSON.parse(row.data) };
  } catch {
    return { ...DEFAULT_ADMIN_CONFIG };
  }
}

async function saveConfig(next: AdminConfig): Promise<AdminConfig> {
  const merged: AdminConfig = { ...DEFAULT_ADMIN_CONFIG, ...next };
  await db.run(
    'INSERT INTO admin_config (id, data) VALUES (1, ?) ON CONFLICT (id) DO UPDATE SET data = excluded.data',
    [JSON.stringify(merged)]
  );
  return merged;
}

function sanitizePublicConfig(cfg: AdminConfig): AdminConfig {
  return {
    ...cfg,
    adminPassword: '',
    gatewayMerchantId: cfg.gatewayMerchantId.trim() ? 'متصل' : '',
  };
}

async function seedMatchesIfNeeded(): Promise<void> {
  const countRow = await db.get<{ c: number }>('SELECT COUNT(*) as c FROM sports_matches');
  if (!countRow || Number(countRow.c) === 0) {
    for (let idx = 0; idx < INITIAL_SPORTS_MATCHES.length; idx += 1) {
      const m = INITIAL_SPORTS_MATCHES[idx];
      await db.run(
        'INSERT INTO sports_matches (id, sort_order, data) VALUES (?, ?, ?) ON CONFLICT (id) DO NOTHING',
        [m.id, idx, JSON.stringify(m)]
      );
    }
  }
}

interface UserRow {
  id: string;
  name: string;
  email_or_phone: string;
  email_lower: string;
  password: string;
  balance: number;
  bonus_locked: number;
  vip_level: string;
  referral_code: string;
  registered_at: string;
  is_blocked: number;
  created_at: number;
}

interface TxRow {
  id: string;
  user_id: string;
  user_name: string;
  type: TransactionRecord['type'];
  method: string;
  amount: number;
  bonus_amount: number;
  status: TransactionRecord['status'];
  tracking_code: string;
  timestamp: string;
  description: string;
  destination: string | null;
  tx_hash_or_ref: string | null;
  created_at: number;
}

interface TicketRow {
  id: string;
  user_id: string;
  selections_json: string;
  stake: number;
  total_odds: number;
  potential_payout: number;
  status: PlacedSportsTicket['status'];
  created_at_label: string;
  created_at: number;
}

interface BetLogRow {
  id: string;
  user_id: string;
  game_title: string;
  bet_amount: number;
  multiplier: number;
  payout: number;
  won: number;
  timestamp: string;
  created_at: number;
}

function mapUserRow(r: UserRow): RegisteredUser {
  return {
    id: r.id,
    name: r.name,
    emailOrPhone: r.email_or_phone,
    password: r.password,
    balance: Number(r.balance) || 0,
    bonusLocked: Number(r.bonus_locked) || 0,
    vipLevel: r.vip_level,
    referralCode: r.referral_code,
    registeredAt: r.registered_at,
    isBlocked: Boolean(Number(r.is_blocked)),
  };
}

function mapTxRow(r: TxRow): TransactionRecord {
  const bonusAmt = Number(r.bonus_amount) || 0;
  return {
    id: r.id,
    type: r.type,
    method: r.method,
    amount: Number(r.amount) || 0,
    bonusAmount: bonusAmt > 0 ? bonusAmt : undefined,
    status: r.status,
    trackingCode: r.tracking_code,
    timestamp: r.timestamp,
    description: r.description,
    userName: r.user_name,
    destination: r.destination || undefined,
    txHashOrRef: r.tx_hash_or_ref || undefined,
  };
}

function mapTicketRow(r: TicketRow): PlacedSportsTicket {
  let selections: BetSlipSelection[] = [];
  try {
    selections = JSON.parse(r.selections_json);
  } catch {
    selections = [];
  }
  return {
    id: r.id,
    selections,
    stake: Number(r.stake) || 0,
    totalOdds: Number(r.total_odds) || 1,
    potentialPayout: Number(r.potential_payout) || 0,
    status: r.status,
    createdAt: r.created_at_label,
  };
}

function mapBetLogRow(r: BetLogRow): BetLogItem {
  return {
    id: r.id,
    gameTitle: r.game_title,
    betAmount: Number(r.bet_amount) || 0,
    multiplier: Number(r.multiplier) || 0,
    payout: Number(r.payout) || 0,
    won: Boolean(Number(r.won)),
    timestamp: r.timestamp,
  };
}

async function getMatchesList(): Promise<SportsMatch[]> {
  const rows = await db.all<{ data: string }>(
    'SELECT data FROM sports_matches ORDER BY sort_order ASC'
  );
  return rows.map((r) => JSON.parse(r.data) as SportsMatch);
}

async function getUserTransactions(userId: string): Promise<TransactionRecord[]> {
  const rows = await db.all<TxRow>(
    'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
    [userId]
  );
  return rows.map(mapTxRow);
}

async function getUserTickets(userId: string): Promise<PlacedSportsTicket[]> {
  const rows = await db.all<TicketRow>(
    'SELECT * FROM sports_tickets WHERE user_id = ? ORDER BY created_at DESC LIMIT 30',
    [userId]
  );
  return rows.map(mapTicketRow);
}

async function getUserBetLogs(userId: string): Promise<BetLogItem[]> {
  const rows = await db.all<BetLogRow>(
    'SELECT * FROM bet_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
    [userId]
  );
  return rows.map(mapBetLogRow);
}

async function getAllAdminState() {
  const [config, users, transactions, betLogs, sportsTickets, matches] = await Promise.all([
    getConfig(),
    db.all<UserRow>('SELECT * FROM users ORDER BY created_at DESC'),
    db.all<TxRow>('SELECT * FROM transactions ORDER BY created_at DESC LIMIT 150'),
    db.all<BetLogRow>('SELECT * FROM bet_logs ORDER BY created_at DESC LIMIT 100'),
    db.all<TicketRow>('SELECT * FROM sports_tickets ORDER BY created_at DESC LIMIT 100'),
    getMatchesList(),
  ]);

  return {
    config,
    registeredUsers: users.map(mapUserRow),
    transactions: transactions.map(mapTxRow),
    betLogs: betLogs.map(mapBetLogRow),
    sportsTickets: sportsTickets.map(mapTicketRow),
    matches,
  };
}

function wrapAsync(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

const requireAdmin = wrapAsync(async (req: Request, res: Response, next: NextFunction) => {
  const adminUser = String(req.headers['x-admin-user'] || '').trim();
  const adminPass = String(req.headers['x-admin-pass'] || '');
  const cfg = await getConfig();
  if (adminUser !== 'MROFF' || adminPass !== cfg.adminPassword) {
    res.status(401).json({ error: 'دسترسی غیرمجاز به پنل مدیریت' });
    return;
  }
  next();
});

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true, db: db.mode });
});

app.get(
  '/api/bootstrap',
  wrapAsync(async (req: Request, res: Response) => {
    const userId = String(req.query.userId || '').trim();
    const [rawCfg, matches] = await Promise.all([getConfig(), getMatchesList()]);
    const config = sanitizePublicConfig(rawCfg);

    if (!userId) {
      res.json({
        config,
        matches,
        currentUser: null,
        transactions: [],
        sportsTickets: [],
        betLogs: [],
      });
      return;
    }

    const userRow = await db.get<UserRow>('SELECT * FROM users WHERE id = ?', [userId]);
    if (!userRow || Number(userRow.is_blocked)) {
      res.json({
        config,
        matches,
        currentUser: null,
        blocked: Boolean(userRow && Number(userRow.is_blocked)),
        transactions: [],
        sportsTickets: [],
        betLogs: [],
      });
      return;
    }

    const mapped = mapUserRow(userRow);
    const { password: _hidden, ...safeUser } = mapped;
    const [transactions, sportsTickets, betLogs] = await Promise.all([
      getUserTransactions(userRow.id),
      getUserTickets(userRow.id),
      getUserBetLogs(userRow.id),
    ]);

    res.json({
      config,
      matches,
      currentUser: safeUser,
      transactions,
      sportsTickets,
      betLogs,
    });
  })
);

app.post(
  '/api/migrate-local',
  wrapAsync(async (req: Request, res: Response) => {
    const countRow = await db.get<{ c: number }>('SELECT COUNT(*) as c FROM users');
    if (countRow && Number(countRow.c) > 0) {
      res.json({ migrated: false });
      return;
    }

    const body = req.body as {
      registeredUsers?: RegisteredUser[];
      adminConfig?: Partial<AdminConfig>;
    };

    if (body.adminConfig && typeof body.adminConfig === 'object') {
      const current = await getConfig();
      await saveConfig({ ...current, ...body.adminConfig });
    }

    const list = Array.isArray(body.registeredUsers) ? body.registeredUsers : [];
    let migratedCount = 0;

    for (let idx = 0; idx < list.length; idx += 1) {
      const u = list[idx];
      if (!u?.id || !u?.emailOrPhone || !u?.password) continue;
      await db.run(
        `INSERT INTO users (
          id, name, email_or_phone, email_lower, password, balance, bonus_locked,
          vip_level, referral_code, registered_at, is_blocked, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING`,
        [
          u.id,
          u.name || 'کاربر',
          u.emailOrPhone.trim(),
          u.emailOrPhone.trim().toLowerCase(),
          u.password,
          Math.max(0, Math.round(Number(u.balance) || 0)),
          Math.max(0, Math.round(Number(u.bonusLocked) || 0)),
          u.vipLevel || 'طلایی',
          u.referralCode || `DH${1000 + idx}`,
          u.registeredAt || nowTimeFa(),
          u.isBlocked ? 1 : 0,
          Date.now() - idx * 1000,
        ]
      );
      migratedCount += 1;
    }

    res.json({ migrated: migratedCount > 0, count: migratedCount });
  })
);

app.post(
  '/api/auth/register',
  wrapAsync(async (req: Request, res: Response) => {
    const { name, emailOrPhone, password } = req.body as {
      name?: string;
      emailOrPhone?: string;
      password?: string;
    };

    const cleanName = String(name || '').trim();
    const cleanContact = String(emailOrPhone || '').trim();
    const cleanPass = String(password || '');

    if (!cleanName || !cleanContact || cleanPass.length < 4) {
      res.status(400).json({ error: 'لطفاً نام، ایمیل/شماره موبایل و رمز عبور معتبر وارد کنید.' });
      return;
    }

    const emailLower = cleanContact.toLowerCase();
    const existing = await db.get<{ id: string }>(
      'SELECT id FROM users WHERE email_lower = ?',
      [emailLower]
    );
    if (existing) {
      res.status(409).json({
        error: 'این ایمیل یا شماره موبایل قبلاً ثبت شده است. لطفاً وارد شوید.',
      });
      return;
    }

    const cfg = await getConfig();
    const welcomeGift =
      cfg.welcomeBonusEnabled && cfg.welcomeBonusAmount > 0
        ? Math.round(cfg.welcomeBonusAmount)
        : 0;

    const now = Date.now();
    const userId = `usr-${now}-${Math.floor(100 + Math.random() * 899)}`;
    const referralCode = `DH${Math.floor(1000 + Math.random() * 8999)}`;
    const timeLabel = nowTimeFa();

    await db.run(
      `INSERT INTO users (
        id, name, email_or_phone, email_lower, password, balance, bonus_locked,
        vip_level, referral_code, registered_at, is_blocked, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [
        userId,
        cleanName,
        cleanContact,
        emailLower,
        cleanPass,
        welcomeGift,
        welcomeGift,
        'طلایی',
        referralCode,
        timeLabel,
        now,
      ]
    );

    if (welcomeGift > 0) {
      await db.run(
        `INSERT INTO transactions (
          id, user_id, user_name, type, method, amount, bonus_amount, status,
          tracking_code, timestamp, description, destination, tx_hash_or_ref, created_at
        ) VALUES (?, ?, ?, 'bonus', ?, ?, 0, 'موفق', ?, ?, ?, NULL, NULL, ?)`,
        [
          `tx-welcome-${now}`,
          userId,
          cleanName,
          'بونوس خوش‌آمدگویی ثبت‌نام',
          welcomeGift,
          genCode('WLC'),
          timeLabel,
          'هدیه خوش‌آمدگویی ثبت‌نام (سود حاصل قابل برداشت)',
          now,
        ]
      );
    }

    const row = (await db.get<UserRow>('SELECT * FROM users WHERE id = ?', [userId]))!;
    const { password: _hidden, ...safeUser } = mapUserRow(row);
    const transactions = await getUserTransactions(userId);

    res.json({
      user: safeUser,
      transactions,
      sportsTickets: [],
      betLogs: [],
    });
  })
);

app.post(
  '/api/auth/login',
  wrapAsync(async (req: Request, res: Response) => {
    const { emailOrPhone, password } = req.body as {
      emailOrPhone?: string;
      password?: string;
    };

    const emailLower = String(emailOrPhone || '').trim().toLowerCase();
    const cleanPass = String(password || '');

    const row = await db.get<UserRow>('SELECT * FROM users WHERE email_lower = ?', [emailLower]);
    if (!row) {
      res.status(404).json({
        error: 'حسابی با این ایمیل یا شماره یافت نشد. لطفاً ابتدا ثبت نام کنید.',
      });
      return;
    }
    if (row.password !== cleanPass) {
      res.status(401).json({ error: 'رمز عبور واردشده اشتباه است.' });
      return;
    }
    if (Number(row.is_blocked)) {
      res.status(403).json({ error: 'این حساب کاربری توسط مدیریت مسدود شده است.' });
      return;
    }

    const { password: _hidden, ...safeUser } = mapUserRow(row);
    const [transactions, sportsTickets, betLogs] = await Promise.all([
      getUserTransactions(row.id),
      getUserTickets(row.id),
      getUserBetLogs(row.id),
    ]);

    res.json({
      user: safeUser,
      transactions,
      sportsTickets,
      betLogs,
    });
  })
);

app.post(
  '/api/user/balance',
  wrapAsync(async (req: Request, res: Response) => {
    const { userId, delta, betLog } = req.body as {
      userId?: string;
      delta?: number;
      betLog?: {
        gameTitle: string;
        betAmount: number;
        multiplier: number;
        payout: number;
        won: boolean;
        timestamp: string;
      };
    };

    if (!userId) {
      res.status(400).json({ error: 'شناسه کاربر الزامی است' });
      return;
    }

    const row = await db.get<UserRow>('SELECT * FROM users WHERE id = ?', [userId]);
    if (!row || Number(row.is_blocked)) {
      res.status(403).json({ error: 'حساب کاربری معتبر نیست یا مسدود شده است.' });
      return;
    }

    const numDelta = Number(delta) || 0;
    const currentBal = Number(row.balance) || 0;
    const currentLocked = Number(row.bonus_locked) || 0;
    const nextBalance = Math.max(0, Math.round(currentBal + numDelta));
    const nextLocked = nextBalance <= 0 ? 0 : currentLocked;

    await db.run('UPDATE users SET balance = ?, bonus_locked = ? WHERE id = ?', [
      nextBalance,
      nextLocked,
      userId,
    ]);

    if (betLog && betLog.gameTitle) {
      const now = Date.now();
      await db.run(
        `INSERT INTO bet_logs (
          id, user_id, game_title, bet_amount, multiplier, payout, won, timestamp, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `bet-${now}-${Math.floor(100 + Math.random() * 899)}`,
          userId,
          betLog.gameTitle,
          Math.round(Number(betLog.betAmount) || 0),
          Number(betLog.multiplier) || 0,
          Math.round(Number(betLog.payout) || 0),
          betLog.won ? 1 : 0,
          betLog.timestamp || nowTimeFa(),
          now,
        ]
      );
    }

    res.json({ balance: nextBalance, bonusLocked: nextLocked });
  })
);

app.post(
  '/api/crash/consume-forced',
  wrapAsync(async (_req: Request, res: Response) => {
    const cfg = await getConfig();
    if (cfg.forcedNextCrash !== null) {
      await saveConfig({ ...cfg, forcedNextCrash: null });
    }
    res.json({ ok: true });
  })
);

app.post(
  '/api/transactions/deposit',
  wrapAsync(async (req: Request, res: Response) => {
    const {
      userId,
      amount,
      bonusAmount,
      method,
      trackingCode,
      txHashOrRef,
      requestedAutoApprove,
    } = req.body as {
      userId?: string;
      amount?: number;
      bonusAmount?: number;
      method?: string;
      trackingCode?: string;
      txHashOrRef?: string;
      requestedAutoApprove?: boolean;
    };

    if (!userId) {
      res.status(401).json({ error: 'لطفاً ابتدا وارد حساب کاربری شوید.' });
      return;
    }

    const cfg = await getConfig();
    if (!cfg.depositEnabled) {
      res.status(403).json({ error: 'درگاه واریز موقتاً غیرفعال است.' });
      return;
    }

    const row = await db.get<UserRow>('SELECT * FROM users WHERE id = ?', [userId]);
    if (!row || Number(row.is_blocked)) {
      res.status(403).json({ error: 'حساب کاربری یافت نشد یا مسدود است.' });
      return;
    }

    const cleanAmount = Math.max(0, Math.round(Number(amount) || 0));
    const cleanBonus = Math.max(0, Math.round(Number(bonusAmount) || 0));
    const totalCredit = cleanAmount + cleanBonus;

    const autoApproved = Boolean(
      requestedAutoApprove && cfg.autoApproveGateway && cfg.gatewayMerchantId.trim()
    );

    let nextBalance = Number(row.balance) || 0;
    let nextLocked = Number(row.bonus_locked) || 0;

    if (autoApproved) {
      if (nextLocked > nextBalance) {
        nextLocked = nextBalance;
      }
      nextBalance += totalCredit;
      await db.run('UPDATE users SET balance = ?, bonus_locked = ? WHERE id = ?', [
        nextBalance,
        nextLocked,
        userId,
      ]);
    }

    const now = Date.now();
    const txId = `tx-${now}-${Math.floor(100 + Math.random() * 899)}`;
    const timeLabel = nowTimeFa();
    const status: TransactionRecord['status'] = autoApproved ? 'موفق' : 'در انتظار تایید';
    const desc =
      cleanBonus > 0
        ? `درخواست واریز + بونوس (${cleanBonus.toLocaleString('fa-IR')} تومان)`
        : 'درخواست واریز به کیف پول';

    await db.run(
      `INSERT INTO transactions (
        id, user_id, user_name, type, method, amount, bonus_amount, status,
        tracking_code, timestamp, description, destination, tx_hash_or_ref, created_at
      ) VALUES (?, ?, ?, 'deposit', ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
      [
        txId,
        userId,
        row.name,
        String(method || 'واریز بانکی'),
        totalCredit,
        cleanBonus,
        status,
        String(trackingCode || genCode('GW')),
        timeLabel,
        desc,
        txHashOrRef ? String(txHashOrRef) : null,
        now,
      ]
    );

    const txRow = (await db.get<TxRow>('SELECT * FROM transactions WHERE id = ?', [txId]))!;
    res.json({
      transaction: mapTxRow(txRow),
      balance: nextBalance,
      bonusLocked: nextLocked,
      autoApproved,
    });
  })
);

app.post(
  '/api/transactions/withdraw',
  wrapAsync(async (req: Request, res: Response) => {
    const { userId, amount, destination, method, trackingCode } = req.body as {
      userId?: string;
      amount?: number;
      destination?: string;
      method?: string;
      trackingCode?: string;
    };

    if (!userId) {
      res.status(401).json({ error: 'لطفاً ابتدا وارد حساب کاربری شوید.' });
      return;
    }

    const cfg = await getConfig();
    if (!cfg.withdrawEnabled) {
      res.status(403).json({ error: 'بخش برداشت جایزه موقتاً بسته است.' });
      return;
    }

    const row = await db.get<UserRow>('SELECT * FROM users WHERE id = ?', [userId]);
    if (!row || Number(row.is_blocked)) {
      res.status(403).json({ error: 'حساب کاربری معتبر نیست یا مسدود است.' });
      return;
    }

    const currentBal = Number(row.balance) || 0;
    const currentLocked = Number(row.bonus_locked) || 0;
    const cleanAmount = Math.max(0, Math.round(Number(amount) || 0));
    const withdrawable = Math.max(0, currentBal - currentLocked);

    if (cleanAmount < 100000 || cleanAmount > withdrawable) {
      res.status(400).json({ error: 'مبلغ درخواستی مجاز یا قابل برداشت نیست.' });
      return;
    }

    const nextBalance = Math.max(0, currentBal - cleanAmount);
    const nextLocked = nextBalance <= 0 ? 0 : currentLocked;

    await db.run('UPDATE users SET balance = ?, bonus_locked = ? WHERE id = ?', [
      nextBalance,
      nextLocked,
      userId,
    ]);

    const now = Date.now();
    const txId = `tx-${now}-${Math.floor(100 + Math.random() * 899)}`;
    const timeLabel = nowTimeFa();
    const status: TransactionRecord['status'] = cfg.autoApproveWithdraw ? 'موفق' : 'در انتظار تایید';

    await db.run(
      `INSERT INTO transactions (
        id, user_id, user_name, type, method, amount, bonus_amount, status,
        tracking_code, timestamp, description, destination, tx_hash_or_ref, created_at
      ) VALUES (?, ?, ?, 'withdraw', ?, ?, 0, ?, ?, ?, 'درخواست برداشت جایزه بانکی', ?, NULL, ?)`,
      [
        txId,
        userId,
        row.name,
        String(method || 'واریز بانکی'),
        cleanAmount,
        status,
        String(trackingCode || genCode('WDR')),
        timeLabel,
        String(destination || ''),
        now,
      ]
    );

    const txRow = (await db.get<TxRow>('SELECT * FROM transactions WHERE id = ?', [txId]))!;
    res.json({
      transaction: mapTxRow(txRow),
      balance: nextBalance,
      bonusLocked: nextLocked,
    });
  })
);

app.post(
  '/api/bonuses/claim',
  wrapAsync(async (req: Request, res: Response) => {
    const { userId, title, amount } = req.body as {
      userId?: string;
      title?: string;
      amount?: number;
    };

    if (!userId) {
      res.status(401).json({ error: 'ابتدا ثبت نام کنید.' });
      return;
    }

    const row = await db.get<UserRow>('SELECT * FROM users WHERE id = ?', [userId]);
    if (!row || Number(row.is_blocked)) {
      res.status(403).json({ error: 'حساب معتبر نیست.' });
      return;
    }

    const cleanAmount = Math.max(0, Math.round(Number(amount) || 0));
    const nextBalance = (Number(row.balance) || 0) + cleanAmount;
    await db.run('UPDATE users SET balance = ? WHERE id = ?', [nextBalance, userId]);

    const now = Date.now();
    const txId = `tx-${now}`;
    await db.run(
      `INSERT INTO transactions (
        id, user_id, user_name, type, method, amount, bonus_amount, status,
        tracking_code, timestamp, description, destination, tx_hash_or_ref, created_at
      ) VALUES (?, ?, ?, 'bonus', 'بونوس داهود بت', ?, 0, 'موفق', ?, ?, ?, NULL, NULL, ?)`,
      [txId, userId, row.name, cleanAmount, genCode('BNS'), nowTimeFa(), String(title || 'بونوس'), now]
    );

    const txRow = (await db.get<TxRow>('SELECT * FROM transactions WHERE id = ?', [txId]))!;
    res.json({ transaction: mapTxRow(txRow), balance: nextBalance });
  })
);

app.post(
  '/api/sports/place',
  wrapAsync(async (req: Request, res: Response) => {
    const { userId, selections, stake, totalOdds, potentialPayout } = req.body as {
      userId?: string;
      selections?: BetSlipSelection[];
      stake?: number;
      totalOdds?: number;
      potentialPayout?: number;
    };

    if (!userId) {
      res.status(401).json({ error: 'برای ثبت فرم ابتدا وارد حساب خود شوید.' });
      return;
    }

    const row = await db.get<UserRow>('SELECT * FROM users WHERE id = ?', [userId]);
    const currentBal = row ? Number(row.balance) || 0 : 0;
    const cleanStake = Math.max(0, Math.round(Number(stake) || 0));

    if (!row || Number(row.is_blocked) || cleanStake <= 0 || cleanStake > currentBal) {
      res.status(400).json({ error: 'موجودی کافی نیست یا فرم نامعتبر است.' });
      return;
    }

    const nextBalance = currentBal - cleanStake;
    const nextLocked = nextBalance <= 0 ? 0 : Number(row.bonus_locked) || 0;

    await db.run('UPDATE users SET balance = ?, bonus_locked = ? WHERE id = ?', [
      nextBalance,
      nextLocked,
      userId,
    ]);

    const now = Date.now();
    const ticketId = `tkt-${now}`;
    const createdAtLabel = nowTimeFa();
    await db.run(
      `INSERT INTO sports_tickets (
        id, user_id, selections_json, stake, total_odds, potential_payout, status, created_at_label, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'در انتظار نتیجه', ?, ?)`,
      [
        ticketId,
        userId,
        JSON.stringify(selections || []),
        cleanStake,
        Number(totalOdds) || 1,
        Math.round(Number(potentialPayout) || cleanStake),
        createdAtLabel,
        now,
      ]
    );

    const ticketRow = (await db.get<TicketRow>(
      'SELECT * FROM sports_tickets WHERE id = ?',
      [ticketId]
    ))!;

    res.json({
      ticket: mapTicketRow(ticketRow),
      balance: nextBalance,
      bonusLocked: nextLocked,
    });
  })
);

app.post(
  '/api/sports/settle',
  wrapAsync(async (req: Request, res: Response) => {
    const { userId, ticketId } = req.body as { userId?: string; ticketId?: string };
    if (!userId || !ticketId) {
      res.status(400).json({ error: 'اطلاعات ناقص است.' });
      return;
    }

    const ticket = await db.get<TicketRow>(
      'SELECT * FROM sports_tickets WHERE id = ? AND user_id = ?',
      [ticketId, userId]
    );
    if (!ticket || ticket.status !== 'در انتظار نتیجه') {
      res.status(404).json({ error: 'فرم یافت نشد یا قبلاً تسویه شده است.' });
      return;
    }

    const won = Math.random() < 0.58;
    const status: PlacedSportsTicket['status'] = won ? 'برنده شده' : 'باخته';
    await db.run('UPDATE sports_tickets SET status = ? WHERE id = ?', [status, ticketId]);

    const userRow = await db.get<UserRow>('SELECT * FROM users WHERE id = ?', [userId]);
    let nextBalance = userRow ? Number(userRow.balance) || 0 : 0;
    if (won && userRow) {
      nextBalance += Number(ticket.potential_payout) || 0;
      await db.run('UPDATE users SET balance = ? WHERE id = ?', [nextBalance, userId]);
    }

    const updated = (await db.get<TicketRow>(
      'SELECT * FROM sports_tickets WHERE id = ?',
      [ticketId]
    ))!;

    res.json({ ticket: mapTicketRow(updated), won, balance: nextBalance });
  })
);

app.post(
  '/api/payment/webhook',
  wrapAsync(async (req: Request, res: Response) => {
    const { trackingCode, status, refId, secret } = req.body as {
      trackingCode?: string;
      status?: 'success' | 'failed';
      refId?: string;
      secret?: string;
    };

    const cfg = await getConfig();
    if (cfg.gatewayMerchantId.trim() && secret !== cfg.gatewayMerchantId.trim()) {
      res.status(401).json({ error: 'Invalid merchant signature' });
      return;
    }

    const tx = await db.get<TxRow>('SELECT * FROM transactions WHERE tracking_code = ?', [
      String(trackingCode || ''),
    ]);
    if (!tx || tx.type !== 'deposit' || tx.status !== 'در انتظار تایید') {
      res.status(404).json({ error: 'Transaction not found or already processed' });
      return;
    }

    if (status === 'success') {
      const userRow = await db.get<UserRow>('SELECT * FROM users WHERE id = ?', [tx.user_id]);
      if (userRow) {
        const curBal = Number(userRow.balance) || 0;
        const curLocked = Number(userRow.bonus_locked) || 0;
        const nextLocked = Math.min(curLocked, curBal);
        await db.run('UPDATE users SET balance = ?, bonus_locked = ? WHERE id = ?', [
          curBal + (Number(tx.amount) || 0),
          nextLocked,
          userRow.id,
        ]);
      }
      await db.run('UPDATE transactions SET status = ?, tx_hash_or_ref = ? WHERE id = ?', [
        'موفق',
        refId ? `RefID: ${refId}` : tx.tx_hash_or_ref,
        tx.id,
      ]);
    } else {
      await db.run('UPDATE transactions SET status = ? WHERE id = ?', ['ناموفق', tx.id]);
    }

    res.json({ ok: true });
  })
);

// ================= ADMIN ROUTES =================

app.post(
  '/api/admin/login',
  wrapAsync(async (req: Request, res: Response) => {
    const { username, password } = req.body as { username?: string; password?: string };
    const cfg = await getConfig();
    if (String(username || '').trim() !== 'MROFF' || String(password || '') !== cfg.adminPassword) {
      res.status(401).json({ error: 'نام کاربری یا رمز عبور مدیریت اشتباه است.' });
      return;
    }
    res.json({ ok: true, state: await getAllAdminState() });
  })
);

app.get(
  '/api/admin/state',
  requireAdmin,
  wrapAsync(async (_req: Request, res: Response) => {
    res.json(await getAllAdminState());
  })
);

app.put(
  '/api/admin/config',
  requireAdmin,
  wrapAsync(async (req: Request, res: Response) => {
    const patch = req.body as Partial<AdminConfig>;
    const current = await getConfig();
    const next = await saveConfig({ ...current, ...patch });
    res.json({ config: next });
  })
);

app.post(
  '/api/admin/users/:userId/balance',
  requireAdmin,
  wrapAsync(async (req: Request, res: Response) => {
    const userId = String(req.params.userId || '');
    const { delta, reason } = req.body as { delta?: number; reason?: string };

    const target = await db.get<UserRow>('SELECT * FROM users WHERE id = ?', [userId]);
    if (!target) {
      res.status(404).json({ error: 'کاربر یافت نشد.' });
      return;
    }

    const numDelta = Math.round(Number(delta) || 0);
    if (numDelta === 0) {
      res.json(await getAllAdminState());
      return;
    }

    const curBal = Number(target.balance) || 0;
    const currentLocked = Number(target.bonus_locked) || 0;
    const nextBalance = Math.max(0, Math.round(curBal + numDelta));
    const nextLocked =
      numDelta > 0 && currentLocked > curBal
        ? curBal
        : nextBalance <= 0
          ? 0
          : currentLocked;

    await db.run('UPDATE users SET balance = ?, bonus_locked = ? WHERE id = ?', [
      nextBalance,
      nextLocked,
      userId,
    ]);

    const now = Date.now();
    await db.run(
      `INSERT INTO transactions (
        id, user_id, user_name, type, method, amount, bonus_amount, status,
        tracking_code, timestamp, description, destination, tx_hash_or_ref, created_at
      ) VALUES (?, ?, ?, ?, 'تغییر موجودی توسط مدیریت', ?, 0, 'موفق', ?, ?, ?, NULL, NULL, ?)`,
      [
        `tx-adm-${now}`,
        userId,
        target.name,
        numDelta >= 0 ? 'bonus' : 'withdraw',
        Math.abs(numDelta),
        genCode('ADM'),
        nowTimeFa(),
        `${reason || 'تنظیم دستی'} (${target.name})`,
        now,
      ]
    );

    res.json({ state: await getAllAdminState(), updatedBalance: nextBalance });
  })
);

app.patch(
  '/api/admin/users/:userId',
  requireAdmin,
  wrapAsync(async (req: Request, res: Response) => {
    const userId = String(req.params.userId || '');
    const patch = req.body as Partial<RegisteredUser>;
    const target = await db.get<UserRow>('SELECT * FROM users WHERE id = ?', [userId]);
    if (!target) {
      res.status(404).json({ error: 'کاربر یافت نشد.' });
      return;
    }

    const nextName = patch.name !== undefined ? String(patch.name) : target.name;
    const nextVip = patch.vipLevel !== undefined ? String(patch.vipLevel) : target.vip_level;
    const nextBlocked =
      patch.isBlocked !== undefined ? (patch.isBlocked ? 1 : 0) : Number(target.is_blocked);
    const nextBalance =
      typeof patch.balance === 'number'
        ? Math.max(0, Math.round(patch.balance))
        : Number(target.balance);

    await db.run(
      'UPDATE users SET name = ?, vip_level = ?, is_blocked = ?, balance = ? WHERE id = ?',
      [nextName, nextVip, nextBlocked, nextBalance, userId]
    );

    res.json({ state: await getAllAdminState() });
  })
);

app.post(
  '/api/admin/transactions/:txId/approve',
  requireAdmin,
  wrapAsync(async (req: Request, res: Response) => {
    const txId = String(req.params.txId || '');
    const tx = await db.get<TxRow>('SELECT * FROM transactions WHERE id = ?', [txId]);
    if (!tx || tx.status !== 'در انتظار تایید') {
      res.status(404).json({ error: 'تراکنش در انتظار تایید یافت نشد.' });
      return;
    }

    await db.run("UPDATE transactions SET status = 'موفق' WHERE id = ?", [txId]);

    if (tx.type === 'deposit') {
      const userRow = await db.get<UserRow>('SELECT * FROM users WHERE id = ?', [tx.user_id]);
      if (userRow) {
        const curBal = Number(userRow.balance) || 0;
        const curLocked = Number(userRow.bonus_locked) || 0;
        const nextLocked = Math.min(curLocked, curBal);
        await db.run('UPDATE users SET balance = ?, bonus_locked = ? WHERE id = ?', [
          curBal + (Number(tx.amount) || 0),
          nextLocked,
          userRow.id,
        ]);
      }
    }

    res.json({ state: await getAllAdminState() });
  })
);

app.post(
  '/api/admin/transactions/:txId/reject',
  requireAdmin,
  wrapAsync(async (req: Request, res: Response) => {
    const txId = String(req.params.txId || '');
    const tx = await db.get<TxRow>('SELECT * FROM transactions WHERE id = ?', [txId]);
    if (!tx || tx.status !== 'در انتظار تایید') {
      res.status(404).json({ error: 'تراکنش در انتظار تایید یافت نشد.' });
      return;
    }

    await db.run("UPDATE transactions SET status = 'رد شده' WHERE id = ?", [txId]);

    if (tx.type === 'withdraw') {
      const userRow = await db.get<UserRow>('SELECT * FROM users WHERE id = ?', [tx.user_id]);
      if (userRow) {
        const curBal = Number(userRow.balance) || 0;
        await db.run('UPDATE users SET balance = ? WHERE id = ?', [
          curBal + (Number(tx.amount) || 0),
          userRow.id,
        ]);
      }
    }

    res.json({ state: await getAllAdminState() });
  })
);

app.patch(
  '/api/admin/matches/:matchId',
  requireAdmin,
  wrapAsync(async (req: Request, res: Response) => {
    const matchId = String(req.params.matchId || '');
    const patch = req.body as Partial<SportsMatch>;
    const row = await db.get<{ data: string }>('SELECT data FROM sports_matches WHERE id = ?', [
      matchId,
    ]);
    if (!row) {
      res.status(404).json({ error: 'مسابقه یافت نشد.' });
      return;
    }
    const current = JSON.parse(row.data) as SportsMatch;
    const updated: SportsMatch = { ...current, ...patch };
    await db.run('UPDATE sports_matches SET data = ? WHERE id = ?', [
      JSON.stringify(updated),
      matchId,
    ]);
    res.json({ state: await getAllAdminState() });
  })
);

app.post(
  '/api/admin/sports/:ticketId/settle',
  requireAdmin,
  wrapAsync(async (req: Request, res: Response) => {
    const ticketId = String(req.params.ticketId || '');
    const { won } = req.body as { won?: boolean };
    const ticket = await db.get<TicketRow>('SELECT * FROM sports_tickets WHERE id = ?', [ticketId]);
    if (!ticket || ticket.status !== 'در انتظار نتیجه') {
      res.status(404).json({ error: 'فرم یافت نشد.' });
      return;
    }

    const didWin = Boolean(won);
    const status: PlacedSportsTicket['status'] = didWin ? 'برنده شده' : 'باخته';
    await db.run('UPDATE sports_tickets SET status = ? WHERE id = ?', [status, ticketId]);

    if (didWin) {
      const userRow = await db.get<UserRow>('SELECT * FROM users WHERE id = ?', [ticket.user_id]);
      if (userRow) {
        const curBal = Number(userRow.balance) || 0;
        await db.run('UPDATE users SET balance = ? WHERE id = ?', [
          curBal + (Number(ticket.potential_payout) || 0),
          userRow.id,
        ]);
      }
    }

    res.json({ state: await getAllAdminState() });
  })
);

// Centralized Express error handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'خطای داخلی سرور رخ داد.' });
});

async function startServer(): Promise<void> {
  await db.init();
  await getConfig();
  await seedMatchesIfNeeded();

  const PORT = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DahoodBet server listening on http://0.0.0.0:${PORT} (db=${db.mode})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
