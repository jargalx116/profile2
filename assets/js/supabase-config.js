/* ============================================================
   Supabase Configuration
   Replace with your own project URL and anon key from:
   https://supabase.com/dashboard → Project Settings → API
   ============================================================ */

const SUPABASE_URL  = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON = 'YOUR_ANON_KEY';

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

/* ── Database Table Names ──────────────────────────────────── */
const DB = {
  PROFILES:  'profiles',
  LISTINGS:  'listings',
  REVIEWS:   'reviews',
  WISHLIST:  'wishlist',
};

/* ── Storage Bucket Names ──────────────────────────────────── */
const STORAGE = {
  LISTING_IMAGES: 'listing-images',
  AVATARS:        'avatars',
  BANNERS:        'banners',
};

/* ── Game Enums ────────────────────────────────────────────── */
const GAMES = [
  { value: 'pubg_mobile', label: 'PUBG Mobile',  icon: '🎮' },
  { value: 'pubg_pc',     label: 'PUBG PC',       icon: '💻' },
  { value: 'cod_mobile',  label: 'COD Mobile',    icon: '🔫' },
  { value: 'genshin',     label: 'Genshin Impact',icon: '⚔️' },
  { value: 'valorant',    label: 'Valorant',      icon: '🎯' },
  { value: 'other',       label: 'Бусад',         icon: '🎲' },
];

const BIND_TYPES = [
  { value: 'facebook',  label: 'Facebook',  icon: '📘' },
  { value: 'google',    label: 'Google',    icon: '🔵' },
  { value: 'twitter',   label: 'Twitter/X', icon: '🐦' },
  { value: 'apple',     label: 'Apple ID',  icon: '🍎' },
  { value: 'none',      label: 'Bind гүй',  icon: '🔓' },
];

const LISTING_STATUS = {
  PENDING:  'pending',
  ACTIVE:   'active',
  SOLD:     'sold',
  REJECTED: 'rejected',
};

/* ── Auth Helpers ──────────────────────────────────────────── */
const Auth = {
  async signInWithGoogle() {
    return _supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/dashboard.html' },
    });
  },
  async signInWithFacebook() {
    return _supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: { redirectTo: window.location.origin + '/dashboard.html' },
    });
  },
  async signOut() {
    return _supabase.auth.signOut();
  },
  async getUser() {
    const { data } = await _supabase.auth.getUser();
    return data?.user ?? null;
  },
  onAuthChange(cb) {
    return _supabase.auth.onAuthStateChange((_event, session) => cb(session?.user ?? null));
  },
};

/* ── Profile Helpers ───────────────────────────────────────── */
const Profiles = {
  async get(userId) {
    const { data } = await _supabase.from(DB.PROFILES).select('*').eq('id', userId).single();
    return data;
  },
  async upsert(profile) {
    return _supabase.from(DB.PROFILES).upsert(profile);
  },
  async getPublic(userId) {
    const { data } = await _supabase
      .from(DB.PROFILES)
      .select('id,username,avatar_url,banner_url,bio,verified,rating,review_count,listing_count,joined_at')
      .eq('id', userId).single();
    return data;
  },
};

/* ── Listing Helpers ───────────────────────────────────────── */
const Listings = {
  async list({ game, minPrice, maxPrice, bindType, sort = 'created_at', page = 1, pageSize = 20 } = {}) {
    let q = _supabase
      .from(DB.LISTINGS)
      .select(`
        *,
        profiles:seller_id(username,avatar_url,verified,rating)
      `)
      .eq('status', LISTING_STATUS.ACTIVE);

    if (game && game !== 'all') q = q.eq('game', game);
    if (minPrice) q = q.gte('price', minPrice);
    if (maxPrice) q = q.lte('price', maxPrice);
    if (bindType && bindType !== 'all') q = q.eq('bind_type', bindType);

    const sortMap = {
      created_at: { col: 'created_at', asc: false },
      price_asc:  { col: 'price',      asc: true  },
      price_desc: { col: 'price',      asc: false },
      hot:        { col: 'view_count', asc: false },
    };
    const s = sortMap[sort] ?? sortMap.created_at;
    q = q.order(s.col, { ascending: s.asc });

    const from = (page - 1) * pageSize;
    q = q.range(from, from + pageSize - 1);

    const { data, error, count } = await q;
    return { data: data ?? [], error, count };
  },

  async get(id) {
    const { data } = await _supabase
      .from(DB.LISTINGS)
      .select(`*, profiles:seller_id(id,username,avatar_url,banner_url,verified,rating,review_count,bio)`)
      .eq('id', id).single();
    return data;
  },

  async create(listing) {
    return _supabase.from(DB.LISTINGS).insert(listing).select().single();
  },

  async update(id, updates) {
    return _supabase.from(DB.LISTINGS).update(updates).eq('id', id).select().single();
  },

  async delete(id) {
    return _supabase.from(DB.LISTINGS).delete().eq('id', id);
  },

  async incrementViews(id) {
    return _supabase.rpc('increment_views', { listing_id: id });
  },

  async getBySeller(sellerId) {
    const { data } = await _supabase
      .from(DB.LISTINGS)
      .select('*')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });
    return data ?? [];
  },
};

/* ── Review Helpers ────────────────────────────────────────── */
const Reviews = {
  async getBySeller(sellerId) {
    const { data } = await _supabase
      .from(DB.REVIEWS)
      .select('*, reviewer:reviewer_id(username,avatar_url)')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });
    return data ?? [];
  },

  async create(review) {
    return _supabase.from(DB.REVIEWS).insert(review).select().single();
  },
};

/* ── Wishlist Helpers ──────────────────────────────────────── */
const Wishlist = {
  async get(userId) {
    const { data } = await _supabase
      .from(DB.WISHLIST)
      .select('listing_id')
      .eq('user_id', userId);
    return (data ?? []).map(r => r.listing_id);
  },
  async toggle(userId, listingId) {
    const { data: existing } = await _supabase
      .from(DB.WISHLIST)
      .select('id')
      .eq('user_id', userId)
      .eq('listing_id', listingId)
      .single();

    if (existing) {
      await _supabase.from(DB.WISHLIST).delete().eq('id', existing.id);
      return false;
    } else {
      await _supabase.from(DB.WISHLIST).insert({ user_id: userId, listing_id: listingId });
      return true;
    }
  },
};

/* ── Image Upload ──────────────────────────────────────────── */
async function uploadImage(bucket, file, path) {
  const ext = file.name.split('.').pop();
  const filePath = path || `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { data, error } = await _supabase.storage.from(bucket).upload(filePath, file, {
    upsert: true, cacheControl: '3600',
  });
  if (error) throw error;

  const { data: { publicUrl } } = _supabase.storage.from(bucket).getPublicUrl(filePath);
  return publicUrl;
}

/* ── Admin Helpers ─────────────────────────────────────────── */
const Admin = {
  async getPendingListings() {
    const { data } = await _supabase
      .from(DB.LISTINGS)
      .select('*, profiles:seller_id(username,avatar_url,verified)')
      .eq('status', LISTING_STATUS.PENDING)
      .order('created_at', { ascending: true });
    return data ?? [];
  },
  async approveListing(id) {
    return _supabase.from(DB.LISTINGS).update({ status: LISTING_STATUS.ACTIVE }).eq('id', id);
  },
  async rejectListing(id, reason) {
    return _supabase.from(DB.LISTINGS).update({ status: LISTING_STATUS.REJECTED, reject_reason: reason }).eq('id', id);
  },
  async verifyUser(userId, verified) {
    return _supabase.from(DB.PROFILES).update({ verified }).eq('id', userId);
  },
  async getAllUsers() {
    const { data } = await _supabase.from(DB.PROFILES).select('*').order('joined_at', { ascending: false });
    return data ?? [];
  },
  async getStats() {
    const [listings, profiles, reviews] = await Promise.all([
      _supabase.from(DB.LISTINGS).select('status'),
      _supabase.from(DB.PROFILES).select('id,verified'),
      _supabase.from(DB.REVIEWS).select('id'),
    ]);
    const l = listings.data ?? [];
    return {
      totalListings:   l.length,
      activeListings:  l.filter(x => x.status === 'active').length,
      pendingListings: l.filter(x => x.status === 'pending').length,
      soldListings:    l.filter(x => x.status === 'sold').length,
      totalUsers:      (profiles.data ?? []).length,
      verifiedSellers: (profiles.data ?? []).filter(x => x.verified).length,
      totalReviews:    (reviews.data ?? []).length,
    };
  },
};
