-- =====================================================
-- DOMAIN 1: IDENTITY & ACCESS MANAGEMENT
-- =====================================================

-- 1.1 users - Core user table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'banned', 'deleted')),
    account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('user', 'sponsor', 'admin', 'moderator')),
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMP,
    last_login_ip INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP -- Soft delete
);

-- 1.2 user_credentials - Extended credential management
CREATE TABLE user_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    password_history TEXT[], -- Array of previous password hashes
    security_question_hash TEXT,
    security_answer_hash TEXT,
    recovery_email VARCHAR(255),
    recovery_phone VARCHAR(20),
    backup_codes TEXT[], -- Array of one-time backup codes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1.3 user_sessions - Active session tracking
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255) UNIQUE,
    device_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    location GEOGRAPHY(POINT),
    country VARCHAR(100),
    city VARCHAR(100),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- 1.4 user_devices - Known devices for users
CREATE TABLE user_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_fingerprint VARCHAR(255) NOT NULL,
    device_name VARCHAR(255),
    device_type VARCHAR(50) CHECK (device_type IN ('mobile', 'tablet', 'desktop', 'other')),
    platform VARCHAR(50) CHECK (platform IN ('ios', 'android', 'windows', 'mac', 'linux', 'other')),
    browser VARCHAR(100),
    push_token VARCHAR(255),
    last_ip INET,
    last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_trusted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, device_fingerprint)
);

-- 1.5 roles - Available roles in system
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    level INTEGER DEFAULT 0, -- Higher number = more privileges
    is_system BOOLEAN DEFAULT FALSE, -- Cannot be deleted
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1.6 permissions - Granular permissions
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource VARCHAR(100) NOT NULL, -- e.g., 'campaign', 'wallet'
    action VARCHAR(50) NOT NULL, -- e.g., 'create', 'read', 'update', 'delete'
    description TEXT,
    UNIQUE(resource, action)
);

-- 1.7 role_permissions - Many-to-many role permissions
CREATE TABLE role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id, permission_id)
);

-- 1.8 user_roles - Many-to-many user roles
CREATE TABLE user_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    granted_by UUID REFERENCES users(id),
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    PRIMARY KEY (user_id, role_id)
);

-- 1.9 user_permissions - Direct user permissions (override roles)
CREATE TABLE user_permissions (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    grant_type VARCHAR(10) CHECK (grant_type IN ('allow', 'deny')),
    granted_by UUID REFERENCES users(id),
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    PRIMARY KEY (user_id, permission_id)
);

-- 1.10 password_resets - Password reset requests
CREATE TABLE password_resets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1.11 email_verifications - Email verification tokens
CREATE TABLE email_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    otp_code VARCHAR(6),
    verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1.12 login_attempts - Track login attempts for security
CREATE TABLE login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT FALSE,
    failure_reason VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1.13 two_factor_auth - 2FA settings
CREATE TABLE two_factor_auth (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    secret VARCHAR(255),
    method VARCHAR(20) CHECK (method IN ('app', 'sms', 'email')),
    backup_codes TEXT[],
    enabled BOOLEAN DEFAULT FALSE,
    last_used TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1.14 user_tokens - API tokens for programmatic access
CREATE TABLE user_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_name VARCHAR(100),
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    permissions JSONB, -- Specific permissions for this token
    last_used TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1.15 api_keys - For sponsor API access
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sponsor_id UUID NOT NULL,
    key_name VARCHAR(100),
    api_key VARCHAR(255) UNIQUE NOT NULL,
    api_secret VARCHAR(255) NOT NULL,
    permissions JSONB,
    rate_limit INTEGER DEFAULT 1000, -- Requests per minute
    last_used TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1.16 oauth_accounts - Social login connections
CREATE TABLE oauth_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('google', 'facebook', 'apple', 'twitter')),
    provider_user_id VARCHAR(255) NOT NULL,
    provider_email VARCHAR(255),
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, provider_user_id)
);

-- 1.17 audit_logs - Comprehensive audit trail
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Identity domain
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_phone ON users(phone) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_sessions_user_active ON user_sessions(user_id, is_active);
CREATE INDEX idx_login_attempts_ip ON login_attempts(ip_address, created_at);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- =====================================================
-- DOMAIN 2: USER PROFILES & PREFERENCES
-- =====================================================

-- 2.1 user_profiles - Extended user information
CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    display_name VARCHAR(100),
    gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'non-binary', 'prefer-not-to-say')),
    birth_date DATE,
    avatar_url TEXT,
    cover_url TEXT,
    bio TEXT,
    website VARCHAR(255),
    occupation VARCHAR(100),
    company VARCHAR(100),
    education TEXT,
    interests TEXT[],
    language_preference VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2.2 user_preferences - User settings and preferences
CREATE TABLE user_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    notification_push BOOLEAN DEFAULT TRUE,
    notification_email BOOLEAN DEFAULT TRUE,
    notification_sms BOOLEAN DEFAULT FALSE,
    notification_marketing BOOLEAN DEFAULT TRUE,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    content_language VARCHAR(10)[],
    content_categories VARCHAR(50)[],
    content_sensitivity BOOLEAN DEFAULT FALSE,
    theme VARCHAR(20) DEFAULT 'light',
    autoplay_videos BOOLEAN DEFAULT TRUE,
    data_saver_mode BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2.3 user_locations - User addresses and locations
CREATE TABLE user_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    location_type VARCHAR(20) CHECK (location_type IN ('home', 'work', 'billing', 'shipping', 'other')),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    coordinates GEOGRAPHY(POINT),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2.4 user_languages - Languages spoken by user
CREATE TABLE user_languages (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    language_code VARCHAR(10) NOT NULL,
    proficiency VARCHAR(20) CHECK (proficiency IN ('native', 'fluent', 'conversational', 'basic')),
    PRIMARY KEY (user_id, language_code)
);

-- 2.5 user_social_links - Social media profiles
CREATE TABLE user_social_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(50) CHECK (platform IN ('twitter', 'instagram', 'facebook', 'linkedin', 'tiktok', 'youtube', 'other')),
    url VARCHAR(255) NOT NULL,
    username VARCHAR(100),
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, platform)
);

-- 2.6 user_verifications - Identity verification records
CREATE TABLE user_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    verification_type VARCHAR(50) CHECK (verification_type IN ('id_card', 'passport', 'drivers_license', 'address_proof', 'business_reg')),
    document_url TEXT[],
    document_number VARCHAR(100),
    issued_country VARCHAR(100),
    issued_date DATE,
    expiry_date DATE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected', 'expired')),
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2.7 user_statistics - Aggregated user stats
CREATE TABLE user_statistics (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    total_cap_earned NUMERIC DEFAULT 0,
    total_cap_spent NUMERIC DEFAULT 0,
    total_ads_watched INTEGER DEFAULT 0,
    total_rooms_joined INTEGER DEFAULT 0,
    total_comments INTEGER DEFAULT 0,
    total_likes_given INTEGER DEFAULT 0,
    total_shares INTEGER DEFAULT 0,
    total_suggestions INTEGER DEFAULT 0,
    total_suggestions_accepted INTEGER DEFAULT 0,
    total_followers INTEGER DEFAULT 0,
    total_following INTEGER DEFAULT 0,
    engagement_rate DECIMAL(5,2) DEFAULT 0,
    daily_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_active_date DATE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2.8 user_activity_logs - Detailed activity tracking
CREATE TABLE user_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    activity_data JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id UUID REFERENCES user_sessions(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2.9 user_followers - Follow relationships
CREATE TABLE user_followers (
    follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID REFERENCES users(id) ON DELETE CASCADE,
    followed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, following_id)
);

-- 2.10 user_blocks - Blocked users
CREATE TABLE user_blocks (
    blocker_id UUID REFERENCES users(id) ON DELETE CASCADE,
    blocked_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR(255),
    blocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (blocker_id, blocked_id)
);

-- 2.11 user_reports - User reports against other users
CREATE TABLE user_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    report_type VARCHAR(50) CHECK (report_type IN ('spam', 'harassment', 'fake', 'inappropriate', 'other')),
    description TEXT,
    evidence_urls TEXT[],
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP,
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2.12 user_referrals - Referral tracking
CREATE TABLE user_referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_email VARCHAR(255),
    referred_phone VARCHAR(20),
    referred_user_id UUID REFERENCES users(id),
    referral_code VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'joined', 'completed', 'expired')),
    reward_amount NUMERIC,
    reward_paid BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Indexes for Profile domain
CREATE INDEX idx_profiles_name ON user_profiles(last_name, first_name);
CREATE INDEX idx_activity_logs_user_time ON user_activity_logs(user_id, created_at);
CREATE INDEX idx_followers_following ON user_followers(following_id);
CREATE INDEX idx_reports_status ON user_reports(status);
CREATE INDEX idx_referrals_code ON user_referrals(referral_code);


-- =====================================================
-- DOMAIN 3: SPONSOR & BRAND MANAGEMENT
-- =====================================================

-- 3.1 sponsors - Sponsor accounts (extends users)
CREATE TABLE sponsors (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    registration_number VARCHAR(100),
    tax_id VARCHAR(100),
    business_type VARCHAR(100),
    business_category VARCHAR(100),
    website VARCHAR(255),
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMP,
    account_manager_id UUID REFERENCES users(id),
    subscription_tier VARCHAR(20) DEFAULT 'basic' CHECK (subscription_tier IN ('basic', 'professional', 'enterprise')),
    subscription_expires TIMESTAMP,
    credit_limit NUMERIC DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3.2 sponsor_accounts - Sponsor financial accounts
CREATE TABLE sponsor_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sponsor_id UUID NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
    account_type VARCHAR(20) CHECK (account_type IN ('prepaid', 'postpaid', 'credit')),
    balance NUMERIC DEFAULT 0,
    reserved_balance NUMERIC DEFAULT 0,
    lifetime_deposits NUMERIC DEFAULT 0,
    lifetime_spend NUMERIC DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    auto_recharge BOOLEAN DEFAULT FALSE,
    auto_recharge_threshold NUMERIC,
    auto_recharge_amount NUMERIC,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3.3 brands - Brands owned by sponsors
CREATE TABLE brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sponsor_id UUID NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    short_description VARCHAR(255),
    logo_url TEXT,
    cover_url TEXT,
    website VARCHAR(255),
    industry VARCHAR(100),
    founded_year INTEGER,
    headquarters VARCHAR(255),
    verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    is_active BOOLEAN DEFAULT TRUE,
    settings JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3.4 brand_members - Team members for brands
CREATE TABLE brand_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) CHECK (role IN ('owner', 'admin', 'manager', 'creator', 'analyst', 'moderator')),
    permissions JSONB,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(brand_id, user_id)
);

-- 3.5 brand_followers - Users following brands
CREATE TABLE brand_followers (
    brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    followed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notification_enabled BOOLEAN DEFAULT TRUE,
    PRIMARY KEY (brand_id, user_id)
);

-- 3.6 brand_categories - Categories for brands
CREATE TABLE brand_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES brand_categories(id),
    icon_url TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3.7 brand_category_mapping - Many-to-many brand categories
CREATE TABLE brand_category_mapping (
    brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
    category_id UUID REFERENCES brand_categories(id) ON DELETE CASCADE,
    PRIMARY KEY (brand_id, category_id)
);

-- 3.8 brand_locations - Brand physical locations
CREATE TABLE brand_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    location_name VARCHAR(255),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100),
    coordinates GEOGRAPHY(POINT),
    phone VARCHAR(20),
    email VARCHAR(255),
    opening_hours JSONB,
    is_headquarters BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3.9 brand_contacts - Contact people for brands
CREATE TABLE brand_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    position VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(20),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3.10 brand_analytics - Aggregated brand analytics
CREATE TABLE brand_analytics (
    brand_id UUID PRIMARY KEY REFERENCES brands(id) ON DELETE CASCADE,
    total_followers INTEGER DEFAULT 0,
    total_impressions INTEGER DEFAULT 0,
    total_engagements INTEGER DEFAULT 0,
    total_cap_distributed NUMERIC DEFAULT 0,
    total_campaigns INTEGER DEFAULT 0,
    total_rooms INTEGER DEFAULT 0,
    avg_engagement_rate DECIMAL(5,2) DEFAULT 0,
    date DATE NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Brand domain
CREATE INDEX idx_brands_sponsor ON brands(sponsor_id);
CREATE INDEX idx_brands_slug ON brands(slug);
CREATE INDEX idx_brand_followers_user ON brand_followers(user_id);
CREATE INDEX idx_brand_categories_parent ON brand_categories(parent_id);
CREATE INDEX idx_brand_analytics_date ON brand_analytics(date);

-- =====================================================
-- DOMAIN 4: ADS & CAMPAIGN MANAGEMENT
-- =====================================================

-- 4.1 campaigns - Main campaign table
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    objective VARCHAR(100) CHECK (objective IN ('awareness', 'engagement', 'conversion', 'traffic', 'sales')),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'active', 'paused', 'completed', 'cancelled', 'rejected')),
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    timezone VARCHAR(50) DEFAULT 'UTC',
    total_budget NUMERIC NOT NULL,
    daily_budget NUMERIC,
    currency VARCHAR(3) DEFAULT 'USD',
    cap_conversion_rate NUMERIC DEFAULT 100, -- 1 USD = 100 CAP
    targeting JSONB,
    created_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (end_date > start_date)
);

-- 4.2 campaign_targets - Detailed targeting criteria
CREATE TABLE campaign_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    target_type VARCHAR(50) CHECK (target_type IN ('location', 'age', 'gender', 'interest', 'behavior', 'device', 'time')),
    target_value JSONB NOT NULL,
    inclusion_type VARCHAR(10) CHECK (inclusion_type IN ('include', 'exclude')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4.3 campaign_schedules - Advanced scheduling
CREATE TABLE campaign_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    day_of_week INTEGER[] CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
    start_time TIME,
    end_time TIME,
    timezone VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE
);

-- 4.4 campaign_budgets - Budget tracking
CREATE TABLE campaign_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    total_budget NUMERIC NOT NULL,
    spent_budget NUMERIC DEFAULT 0,
    reserved_budget NUMERIC DEFAULT 0,
    daily_spent NUMERIC DEFAULT 0,
    daily_reset_date DATE,
    last_reset_at TIMESTAMP,
    currency VARCHAR(3) DEFAULT 'USD',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4.5 campaign_cap_allocations - CAP distribution tracking
CREATE TABLE campaign_cap_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    total_cap_allocated NUMERIC NOT NULL,
    cap_spent NUMERIC DEFAULT 0,
    cap_remaining NUMERIC GENERATED ALWAYS AS (total_cap_allocated - cap_spent) STORED,
    last_distribution TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4.6 ads - Individual advertisements
CREATE TABLE ads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) CHECK (type IN ('video', 'image', 'carousel', 'text', 'poll', 'interactive')),
    format VARCHAR(50),
    content JSONB NOT NULL, -- Stores URLs, text, etc based on type
    destination_url VARCHAR(255),
    call_to_action VARCHAR(50),
    reward_weights JSONB, -- Custom CAP rewards per action
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4.7 ad_assets - Media assets for ads
CREATE TABLE ad_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
    asset_type VARCHAR(50) CHECK (asset_type IN ('video', 'image', 'thumbnail', 'audio')),
    asset_url TEXT NOT NULL,
    asset_size INTEGER, -- In bytes
    mime_type VARCHAR(100),
    width INTEGER,
    height INTEGER,
    duration INTEGER, -- For videos (seconds)
    alt_text VARCHAR(255),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4.8 ad_types - Available ad format types
CREATE TABLE ad_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    specifications JSONB,
    is_active BOOLEAN DEFAULT TRUE
);

-- 4.9 ad_categories - Categories for ads (PRD Section 3.0)
CREATE TABLE ad_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id VARCHAR(20) UNIQUE NOT NULL, -- CAT-01, CAT-02 etc
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon_url TEXT,
    parent_id UUID REFERENCES ad_categories(id),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4.10 ad_category_mapping - Many-to-many ad categories
CREATE TABLE ad_category_mapping (
    ad_id UUID REFERENCES ads(id) ON DELETE CASCADE,
    category_id UUID REFERENCES ad_categories(id) ON DELETE CASCADE,
    PRIMARY KEY (ad_id, category_id)
);

-- 4.11 ad_tags - Tags for better discoverability
CREATE TABLE ad_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4.12 ad_tag_mapping - Many-to-many ad tags
CREATE TABLE ad_tag_mapping (
    ad_id UUID REFERENCES ads(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES ad_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (ad_id, tag_id)
);

-- 4.13 ad_locations - Geographic targeting for specific ads
CREATE TABLE ad_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
    location_type VARCHAR(50) CHECK (location_type IN ('country', 'region', 'city', 'radius')),
    location_value JSONB NOT NULL,
    radius_km INTEGER, -- For radius targeting
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4.14 ad_impressions - Track ad views
CREATE TABLE ad_impressions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id UUID REFERENCES user_sessions(id),
    ip_address INET,
    user_agent TEXT,
    device_type VARCHAR(50),
    location GEOGRAPHY(POINT),
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4.15 ad_clicks - Track ad clicks
CREATE TABLE ad_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id UUID REFERENCES user_sessions(id),
    ip_address INET,
    user_agent TEXT,
    device_type VARCHAR(50),
    location GEOGRAPHY(POINT),
    destination_url VARCHAR(255),
    clicked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Campaign domain
CREATE INDEX idx_campaigns_brand ON campaigns(brand_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_dates ON campaigns(start_date, end_date);
CREATE INDEX idx_ads_campaign ON ads(campaign_id);
CREATE INDEX idx_ads_type ON ads(type);
CREATE INDEX idx_impressions_ad_time ON ad_impressions(ad_id, viewed_at);
CREATE INDEX idx_clicks_ad ON ad_clicks(ad_id);
CREATE INDEX idx_impressions_user ON ad_impressions(user_id);

-- =====================================================
-- DOMAIN 5: ROOMS & LIVE STREAMING
-- =====================================================

-- 5.1 rooms - Main room table
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    room_type VARCHAR(50) CHECK (room_type IN ('live_demo', 'product_showcase', 'campaign', 'community', 'event')),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'live', 'ended', 'cancelled', 'archived')),
    visibility VARCHAR(20) DEFAULT 'public' CHECK (visibility IN ('public', 'unlisted', 'private')),
    max_participants INTEGER,
    current_participants INTEGER DEFAULT 0,
    scheduled_start TIMESTAMP,
    scheduled_end TIMESTAMP,
    actual_start TIMESTAMP,
    actual_end TIMESTAMP,
    settings JSONB,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5.2 room_hosts - Hosts/moderators for rooms
CREATE TABLE room_hosts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) CHECK (role IN ('host', 'co-host', 'moderator')),
    permissions JSONB,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(room_id, user_id)
);

-- 5.3 room_participants - Users in rooms
CREATE TABLE room_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    role VARCHAR(20) DEFAULT 'viewer' CHECK (role IN ('viewer', 'speaker', 'moderator')),
    permissions JSONB,
    UNIQUE(room_id, user_id, is_active) WHERE is_active = TRUE
);

-- 5.4 room_messages - Chat messages in rooms
CREATE TABLE room_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'announcement', 'poll')),
    content TEXT NOT NULL,
    mentions UUID[], -- Array of mentioned user IDs
    replied_to UUID REFERENCES room_messages(id),
    is_pinned BOOLEAN DEFAULT FALSE,
    is_flagged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

-- 5.5 room_events - Track significant room events
CREATE TABLE room_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('join', 'leave', 'like', 'share', 'reaction', 'purchase', 'milestone')),
    user_id UUID REFERENCES users(id),
    event_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5.6 room_products - Products featured in rooms
CREATE TABLE room_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    product_id UUID NOT NULL, -- References marketplace.products
    featured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    featured_by UUID REFERENCES users(id),
    sort_order INTEGER DEFAULT 0,
    UNIQUE(room_id, product_id)
);

-- 5.7 room_polls - Polls created in rooms
CREATE TABLE room_polls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id),
    question TEXT NOT NULL,
    options JSONB NOT NULL, -- Array of options
    settings JSONB,
    starts_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ends_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5.8 room_poll_votes - Votes on polls
CREATE TABLE room_poll_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL REFERENCES room_polls(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    option_index INTEGER NOT NULL,
    voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(poll_id, user_id)
);

-- 5.9 room_recordings - Recorded sessions
CREATE TABLE room_recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    recording_url TEXT NOT NULL,
    thumbnail_url TEXT,
    duration INTEGER, -- In seconds
    size_bytes INTEGER,
    format VARCHAR(50),
    views INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5.10 room_invites - Invitations to rooms
CREATE TABLE room_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    inviter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invitee_id UUID REFERENCES users(id),
    invitee_email VARCHAR(255),
    invite_code VARCHAR(50) UNIQUE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP
);

-- 5.11 room_reports - Reports against rooms
CREATE TABLE room_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    report_type VARCHAR(50) CHECK (report_type IN ('inappropriate', 'harassment', 'fake', 'scam', 'other')),
    description TEXT,
    evidence_urls TEXT[],
    status VARCHAR(20) DEFAULT 'pending',
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5.12 room_moderation_actions - Actions taken in rooms
CREATE TABLE room_moderation_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    moderator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_type VARCHAR(50) CHECK (action_type IN ('warning', 'mute', 'kick', 'ban', 'unmute', 'unban')),
    duration INTEGER, -- In minutes, NULL for permanent
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- Indexes for Rooms domain
CREATE INDEX idx_rooms_brand ON rooms(brand_id);
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_rooms_scheduled ON rooms(scheduled_start);
CREATE INDEX idx_participants_room_active ON room_participants(room_id, is_active);
CREATE INDEX idx_messages_room_time ON room_messages(room_id, created_at);
CREATE INDEX idx_room_events_room_time ON room_events(room_id, created_at);

-- =====================================================
-- DOMAIN 6: ENGAGEMENT TRACKING
-- =====================================================

-- 6.1 engagement_actions - Types of engagement actions
CREATE TABLE engagement_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    base_cap_reward INTEGER NOT NULL,
    daily_limit INTEGER,
    cooldown_seconds INTEGER,
    requires_verification BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default engagement actions
INSERT INTO engagement_actions (action_code, name, base_cap_reward, daily_limit) VALUES
    ('view', 'View Content', 30, 100),
    ('like', 'Like Content', 10, 200),
    ('comment', 'Post Comment', 20, 50),
    ('share', 'Share Content', 40, 30),
    ('click_link', 'Click Link', 50, 20),
    ('suggest', 'Suggest Improvement', 60, 10),
    ('poll_vote', 'Vote in Poll', 25, 30),
    ('quiz_complete', 'Complete Quiz', 45, 10),
    ('save_product', 'Save Product', 15, 50),
    ('follow_brand', 'Follow Brand', 5, 100),
    ('report_issue', 'Report Issue', 10, 5),
    ('invite_friend', 'Invite Friend', 35, 20);

-- 6.2 user_engagements - Track all user engagements
CREATE TABLE user_engagements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_id UUID NOT NULL REFERENCES engagement_actions(id),
    target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('ad', 'room', 'brand', 'product', 'comment')),
    target_id UUID NOT NULL,
    cap_earned INTEGER,
    engagement_data JSONB,
    ip_address INET,
    session_id UUID REFERENCES user_sessions(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6.3 likes - Likes on content
CREATE TABLE likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('ad', 'room', 'comment', 'product', 'brand')),
    target_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, target_type, target_id)
);

-- 6.4 comments - Comments on content
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('ad', 'room', 'brand', 'product')),
    target_id UUID NOT NULL,
    parent_id UUID REFERENCES comments(id),
    content TEXT NOT NULL,
    likes_count INTEGER DEFAULT 0,
    replies_count INTEGER DEFAULT 0,
    is_edited BOOLEAN DEFAULT FALSE,
    is_flagged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

-- 6.5 shares - Shares of content
CREATE TABLE shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('ad', 'room', 'brand', 'product')),
    target_id UUID NOT NULL,
    platform VARCHAR(50) CHECK (platform IN ('internal', 'facebook', 'twitter', 'whatsapp', 'telegram', 'other')),
    share_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6.6 content_clicks - Clicks on links/content
CREATE TABLE content_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('ad', 'room', 'product', 'link')),
    target_id UUID NOT NULL,
    destination_url TEXT,
    time_spent_seconds INTEGER,
    converted BOOLEAN DEFAULT FALSE,
    conversion_value NUMERIC,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6.7 suggestions - User suggestions/feedback
CREATE TABLE suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('ad', 'room', 'brand', 'campaign')),
    target_id UUID NOT NULL,
    title VARCHAR(255),
    content TEXT NOT NULL,
    category VARCHAR(50) CHECK (category IN ('improvement', 'bug', 'feature', 'content', 'other')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'accepted', 'rejected', 'implemented')),
    accepted_by UUID REFERENCES users(id),
    accepted_at TIMESTAMP,
    reward_amount INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

-- 6.8 poll_responses - Responses to polls
CREATE TABLE poll_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poll_id UUID NOT NULL, -- Can reference room_polls or campaign_polls
    poll_type VARCHAR(20) CHECK (poll_type IN ('room', 'campaign')),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    response_data JSONB NOT NULL,
    cap_earned INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(poll_type, poll_id, user_id)
);

-- 6.9 content_views - Track content views (with duration)
CREATE TABLE content_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('ad', 'room', 'video', 'product')),
    target_id UUID NOT NULL,
    view_duration INTEGER, -- In seconds
    viewed_percentage DECIMAL(5,2),
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6.10 content_reads - For text content
CREATE TABLE content_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('ad', 'article', 'description')),
    target_id UUID NOT NULL,
    read_duration INTEGER, -- In seconds
    scroll_depth INTEGER, -- Percentage
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6.11 content_completions - Track completions of content
CREATE TABLE content_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('ad', 'video', 'quiz', 'challenge')),
    target_id UUID NOT NULL,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reward_amount INTEGER,
    UNIQUE(user_id, target_type, target_id)
);

-- 6.12 engagement_summary - Daily summary of user engagement
CREATE TABLE engagement_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    summary_date DATE NOT NULL,
    total_engagements INTEGER DEFAULT 0,
    total_cap_earned INTEGER DEFAULT 0,
    unique_actions INTEGER DEFAULT 0,
    engagement_minutes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, summary_date)
);

-- Indexes for Engagement domain
CREATE INDEX idx_engagements_user_time ON user_engagements(user_id, created_at);
CREATE INDEX idx_engagements_target ON user_engagements(target_type, target_id);
CREATE INDEX idx_comments_target ON comments(target_type, target_id, created_at);
CREATE INDEX idx_likes_target ON likes(target_type, target_id);
CREATE INDEX idx_suggestions_target ON suggestions(target_type, target_id);
CREATE INDEX idx_content_views_user ON content_views(user_id);
CREATE INDEX idx_engagement_summary_user ON engagement_summary(user_id, summary_date);

-- =====================================================
-- DOMAIN 7: CAP ECONOMY (Convertible Accumulated Points)
-- =====================================================

-- 7.1 cap_wallets - User CAP wallets
CREATE TABLE cap_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    balance NUMERIC DEFAULT 0 NOT NULL CHECK (balance >= 0),
    lifetime_earned NUMERIC DEFAULT 0,
    lifetime_spent NUMERIC DEFAULT 0,
    last_transaction_at TIMESTAMP,
    is_frozen BOOLEAN DEFAULT FALSE,
    freeze_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security
ALTER TABLE cap_wallets ENABLE ROW LEVEL SECURITY;

-- 7.2 cap_transactions - All CAP transactions
CREATE TABLE cap_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES cap_wallets(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('earn', 'spend', 'deposit', 'withdraw', 'transfer_in', 'transfer_out', 'bonus', 'decay', 'refund')),
    amount NUMERIC NOT NULL,
    balance_before NUMERIC NOT NULL,
    balance_after NUMERIC NOT NULL GENERATED ALWAYS AS (balance_before + amount) STORED,
    reference_id UUID, -- Reference to source (engagement_id, order_id, etc)
    reference_type VARCHAR(50),
    description TEXT,
    metadata JSONB,
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7.3 cap_transaction_types - Configuration for transaction types
CREATE TABLE cap_transaction_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    affects_balance BOOLEAN DEFAULT TRUE,
    is_system BOOLEAN DEFAULT FALSE,
    requires_approval BOOLEAN DEFAULT FALSE,
    daily_limit INTEGER,
    monthly_limit INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7.4 cap_earnings - Detailed earning records
CREATE TABLE cap_earnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_id UUID UNIQUE REFERENCES cap_transactions(id),
    engagement_id UUID REFERENCES user_engagements(id),
    action_id UUID REFERENCES engagement_actions(id),
    amount INTEGER NOT NULL,
    multiplier DECIMAL(3,2) DEFAULT 1.0,
    final_amount INTEGER GENERATED ALWAYS AS (amount * multiplier) STORED,
    source_type VARCHAR(50) NOT NULL,
    source_id UUID NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7.5 cap_spendings - Detailed spending records
CREATE TABLE cap_spendings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_id UUID UNIQUE REFERENCES cap_transactions(id),
    order_id UUID, -- References marketplace.orders
    product_id UUID, -- References marketplace.products
    amount INTEGER NOT NULL,
    spending_type VARCHAR(50) CHECK (spending_type IN ('purchase', 'transfer', 'fee', 'other')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7.6 cap_withdrawals - CAP to fiat withdrawals
CREATE TABLE cap_withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_id UUID NOT NULL REFERENCES cap_wallets(id),
    cap_amount INTEGER NOT NULL,
    fiat_amount NUMERIC NOT NULL,
    exchange_rate NUMERIC NOT NULL,
    fee_amount NUMERIC DEFAULT 0,
    net_amount NUMERIC GENERATED ALWAYS AS (fiat_amount - fee_amount) STORED,
    payment_method VARCHAR(50),
    account_details JSONB,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    processed_by UUID REFERENCES users(id),
    processed_at TIMESTAMP,
    failure_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- 7.7 cap_deposits - Fiat to CAP deposits
CREATE TABLE cap_deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_id UUID NOT NULL REFERENCES cap_wallets(id),
    fiat_amount NUMERIC NOT NULL,
    cap_amount INTEGER NOT NULL,
    exchange_rate NUMERIC NOT NULL,
    fee_amount NUMERIC DEFAULT 0,
    payment_method VARCHAR(50),
    payment_provider VARCHAR(50),
    transaction_id VARCHAR(255), -- External payment ID
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- 7.8 cap_conversions - CAP to CAP conversions (different types)
CREATE TABLE cap_conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    from_wallet_id UUID REFERENCES cap_wallets(id),
    from_amount INTEGER NOT NULL,
    to_amount INTEGER NOT NULL,
    conversion_rate NUMERIC NOT NULL,
    conversion_type VARCHAR(50) CHECK (conversion_type IN ('promotional', 'seasonal', 'bonus')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7.9 cap_transfers - User-to-user CAP transfers
CREATE TABLE cap_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    fee_amount INTEGER DEFAULT 0,
    net_amount INTEGER GENERATED ALWAYS AS (amount - fee_amount) STORED,
    note TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    sender_transaction_id UUID REFERENCES cap_transactions(id),
    receiver_transaction_id UUID REFERENCES cap_transactions(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- 7.10 cap_limits - CAP earning/spending limits by user level
CREATE TABLE cap_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_level VARCHAR(50) NOT NULL,
    limit_type VARCHAR(50) CHECK (limit_type IN ('daily_earn', 'daily_spend', 'monthly_earn', 'monthly_spend', 'withdrawal')),
    limit_amount INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7.11 cap_rates - Historical CAP exchange rates
CREATE TABLE cap_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rate_date DATE NOT NULL,
    cap_to_fiat NUMERIC NOT NULL, -- 1 CAP = ? USD
    fiat_to_cap NUMERIC NOT NULL, -- 1 USD = ? CAP
    total_cap_circulation NUMERIC,
    total_fiat_reserve NUMERIC,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(rate_date)
);

-- 7.12 cap_decay_log - Track CAP decay events
CREATE TABLE cap_decay_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_id UUID NOT NULL REFERENCES cap_wallets(id),
    original_balance NUMERIC NOT NULL,
    decay_rate DECIMAL(5,2) NOT NULL,
    decay_amount NUMERIC NOT NULL,
    new_balance NUMERIC NOT NULL,
    decay_reason VARCHAR(50) CHECK (decay_reason IN ('inactivity_12m', 'inactivity_24m', 'inactivity_36m', 'penalty')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for CAP domain
CREATE INDEX idx_cap_transactions_wallet ON cap_transactions(wallet_id, created_at);
CREATE INDEX idx_cap_transactions_reference ON cap_transactions(reference_type, reference_id);
CREATE INDEX idx_cap_withdrawals_user_status ON cap_withdrawals(user_id, status);
CREATE INDEX idx_cap_deposits_user ON cap_deposits(user_id);
CREATE INDEX idx_cap_earnings_user ON cap_earnings(user_id, created_at);
CREATE INDEX idx_cap_rates_date ON cap_rates(rate_date);

-- Trigger to update wallet balance on transaction
CREATE OR REPLACE FUNCTION update_wallet_balance()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE cap_wallets 
    SET balance = balance + NEW.amount,
        last_transaction_at = NEW.created_at
    WHERE id = NEW.wallet_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_cap_transaction
    AFTER INSERT ON cap_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_wallet_balance();


    -- =====================================================
-- DOMAIN 8: MARKETPLACE
-- =====================================================

-- 8.1 product_categories - Product categories
CREATE TABLE product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES product_categories(id),
    icon_url TEXT,
    image_url TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8.2 products - Main products table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    category_id UUID REFERENCES product_categories(id),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    short_description VARCHAR(255),
    price_cap INTEGER, -- Price in CAP
    price_fiat NUMERIC, -- Price in fiat
    currency VARCHAR(3) DEFAULT 'USD',
    stock_quantity INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 5,
    sku VARCHAR(100) UNIQUE,
    barcode VARCHAR(100),
    weight DECIMAL(10,2), -- In kg
    dimensions JSONB, -- {length, width, height}
    is_digital BOOLEAN DEFAULT FALSE,
    digital_download_url TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'inactive', 'discontinued')),
    is_featured BOOLEAN DEFAULT FALSE,
    views_count INTEGER DEFAULT 0,
    sold_count INTEGER DEFAULT 0,
    rating_avg DECIMAL(3,2) DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8.3 product_images - Product images
CREATE TABLE product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    thumbnail_url TEXT,
    alt_text VARCHAR(255),
    sort_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8.4 product_inventory - Inventory tracking
CREATE TABLE product_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID UNIQUE NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0,
    reserved_quantity INTEGER DEFAULT 0,
    available_quantity INTEGER GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,
    reorder_point INTEGER,
    reorder_quantity INTEGER,
    location VARCHAR(255),
    last_counted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8.5 product_variants - Product variants (size, color, etc)
CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    sku VARCHAR(100) UNIQUE,
    attributes JSONB NOT NULL, -- {color: 'red', size: 'M'}
    price_cap INTEGER,
    price_fiat NUMERIC,
    stock_quantity INTEGER DEFAULT 0,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8.6 product_tags - Tags for products
CREATE TABLE product_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    usage_count INTEGER DEFAULT 0
);

-- 8.7 product_tag_mapping - Many-to-many product tags
CREATE TABLE product_tag_mapping (
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES product_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, tag_id)
);

-- 8.8 product_reviews - Product reviews
CREATE TABLE product_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id UUID, -- Verified purchase reference
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title VARCHAR(255),
    content TEXT,
    pros TEXT[],
    cons TEXT[],
    images TEXT[],
    videos TEXT[],
    helpful_count INTEGER DEFAULT 0,
    is_verified_purchase BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'flagged')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, user_id)
);

-- 8.9 review_helpfulness - Track helpful votes on reviews
CREATE TABLE review_helpfulness (
    review_id UUID REFERENCES product_reviews(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    is_helpful BOOLEAN NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (review_id, user_id)
);

-- 8.10 shopping_carts - User shopping carts
CREATE TABLE shopping_carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES user_sessions(id),
    total_items INTEGER DEFAULT 0,
    total_cap INTEGER DEFAULT 0,
    total_fiat NUMERIC DEFAULT 0,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8.11 cart_items - Items in shopping cart
CREATE TABLE cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID NOT NULL REFERENCES shopping_carts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price_cap INTEGER NOT NULL,
    price_fiat NUMERIC NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cart_id, product_id, variant_id)
);

-- 8.12 orders - Orders table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded')),
    payment_status VARCHAR(50) CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    fulfillment_status VARCHAR(50) CHECK (fulfillment_status IN ('pending', 'processing', 'shipped', 'delivered')),
    subtotal_cap INTEGER,
    subtotal_fiat NUMERIC,
    shipping_cap INTEGER DEFAULT 0,
    shipping_fiat NUMERIC DEFAULT 0,
    tax_cap INTEGER DEFAULT 0,
    tax_fiat NUMERIC DEFAULT 0,
    discount_cap INTEGER DEFAULT 0,
    discount_fiat NUMERIC DEFAULT 0,
    total_cap INTEGER GENERATED ALWAYS AS (COALESCE(subtotal_cap,0) + COALESCE(shipping_cap,0) + COALESCE(tax_cap,0) - COALESCE(discount_cap,0)) STORED,
    total_fiat NUMERIC GENERATED ALWAYS AS (COALESCE(subtotal_fiat,0) + COALESCE(shipping_fiat,0) + COALESCE(tax_fiat,0) - COALESCE(discount_fiat,0)) STORED,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method VARCHAR(50),
    shipping_address_id UUID, -- References user_locations
    billing_address_id UUID, -- References user_locations
    notes TEXT,
    placed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP,
    shipped_at TIMESTAMP,
    delivered_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancelled_reason TEXT
);

-- 8.13 order_items - Items in orders
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    variant_id UUID REFERENCES product_variants(id),
    product_name VARCHAR(255) NOT NULL,
    sku VARCHAR(100),
    quantity INTEGER NOT NULL,
    unit_price_cap INTEGER,
    unit_price_fiat NUMERIC,
    total_price_cap INTEGER GENERATED ALWAYS AS (quantity * COALESCE(unit_price_cap,0)) STORED,
    total_price_fiat NUMERIC GENERATED ALWAYS AS (quantity * COALESCE(unit_price_fiat,0)) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8.14 order_status_history - Track order status changes
CREATE TABLE order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    notes TEXT,
    changed_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8.15 order_payments - Payment details for orders
CREATE TABLE order_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    payment_type VARCHAR(20) CHECK (payment_type IN ('cap', 'fiat', 'hybrid')),
    cap_amount INTEGER,
    fiat_amount NUMERIC,
    payment_method VARCHAR(50),
    transaction_id VARCHAR(255), -- External payment reference
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);

-- 8.16 order_shipments - Shipping information
CREATE TABLE order_shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    tracking_number VARCHAR(255),
    carrier VARCHAR(100),
    shipping_method VARCHAR(100),
    estimated_delivery DATE,
    actual_delivery DATE,
    shipping_label_url TEXT,
    tracking_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8.17 order_returns - Return requests
CREATE TABLE order_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    reason VARCHAR(255) NOT NULL,
    items JSONB NOT NULL, -- Array of items being returned
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    refund_amount_cap INTEGER,
    refund_amount_fiat NUMERIC,
    notes TEXT,
    approved_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);

-- 8.18 wishlists - User wishlists
CREATE TABLE wishlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) DEFAULT 'My Wishlist',
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8.19 wishlist_items - Items in wishlists
CREATE TABLE wishlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wishlist_id UUID NOT NULL REFERENCES wishlists(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(wishlist_id, product_id)
);

-- Indexes for Marketplace domain
CREATE INDEX idx_products_brand ON products(brand_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_placed ON orders(placed_at);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_product_reviews_product ON product_reviews(product_id);
CREATE INDEX idx_product_reviews_user ON product_reviews(user_id);


-- =====================================================
-- DOMAIN 9: MESSAGING & NOTIFICATIONS
-- =====================================================

-- 9.1 conversations - Private conversations between users
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_type VARCHAR(20) CHECK (conversation_type IN ('direct', 'group', 'support')),
    title VARCHAR(255),
    created_by UUID REFERENCES users(id),
    is_archived BOOLEAN DEFAULT FALSE,
    last_message_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9.2 conversation_participants - Users in conversations
CREATE TABLE conversation_participants (
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP,
    is_admin BOOLEAN DEFAULT FALSE,
    muted_until TIMESTAMP,
    PRIMARY KEY (conversation_id, user_id)
);

-- 9.3 messages - Messages in conversations
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video', 'file', 'system')),
    content TEXT NOT NULL,
    attachments JSONB,
    mentions UUID[],
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_for_everyone BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

-- 9.4 message_reads - Track read receipts
CREATE TABLE message_reads (
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (message_id, user_id)
);

-- 9.5 notifications - All notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('financial', 'engagement', 'campaign', 'room', 'achievement', 'system', 'ai', 'social')),
    title VARCHAR(255) NOT NULL,
    body TEXT,
    data JSONB, -- Deep link data
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
    is_read BOOLEAN DEFAULT FALSE,
    is_clicked BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    clicked_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9.6 notification_preferences - User notification settings
CREATE TABLE notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    push_enabled BOOLEAN DEFAULT TRUE,
    email_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT FALSE,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    preferences JSONB NOT NULL DEFAULT '{
        "financial": true,
        "engagement": true,
        "campaigns": true,
        "rooms": true,
        "achievements": true,
        "system": true,
        "ai": false,
        "social": true
    }',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9.7 notification_logs - Log of sent notifications
CREATE TABLE notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_id UUID REFERENCES notifications(id),
    channel VARCHAR(20) CHECK (channel IN ('push', 'email', 'sms', 'in-app')),
    status VARCHAR(20) CHECK (status IN ('sent', 'delivered', 'failed', 'clicked')),
    error_message TEXT,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP
);

-- 9.8 email_notifications - Email queue
CREATE TABLE email_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email_to VARCHAR(255) NOT NULL,
    email_from VARCHAR(255),
    subject VARCHAR(255) NOT NULL,
    template_name VARCHAR(100),
    template_data JSONB,
    html_content TEXT,
    text_content TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'opened', 'clicked')),
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    sent_at TIMESTAMP,
    opened_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9.9 sms_notifications - SMS queue
CREATE TABLE sms_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    template_name VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered')),
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9.10 push_notifications - Push notification queue
CREATE TABLE push_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_token_id UUID REFERENCES user_devices(id),
    title VARCHAR(255) NOT NULL,
    body TEXT,
    data JSONB,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'clicked')),
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    sent_at TIMESTAMP,
    clicked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Messaging domain
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE is_read = FALSE;
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX idx_email_notifications_status ON email_notifications(status);
CREATE INDEX idx_push_notifications_status ON push_notifications(status);


-- =====================================================
-- DOMAIN 10: GAMIFICATION & USER RANKS
-- =====================================================

-- 10.1 levels - Rank/level definitions
CREATE TABLE levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level_number INTEGER UNIQUE NOT NULL,
    name VARCHAR(50) NOT NULL, -- Explorer, Engager, etc
    display_name VARCHAR(100),
    min_cap INTEGER NOT NULL,
    max_cap INTEGER,
    badge_icon TEXT,
    badge_color VARCHAR(50),
    benefits JSONB, -- {cap_multiplier: 1.2, daily_limit: 1000}
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial levels from PRD
INSERT INTO levels (level_number, name, min_cap, benefits) VALUES
    (1, 'Explorer', 0, '{"cap_multiplier": 1.0, "daily_cap_limit": 200, "badge": "bronze_compass"}'),
    (2, 'Engager', 1000, '{"cap_multiplier": 1.1, "daily_cap_limit": 500, "badge": "silver_star"}'),
    (3, 'Contributor', 5000, '{"cap_multiplier": 1.2, "daily_cap_limit": 1000, "badge": "gold_handshake"}'),
    (4, 'Influencer', 25000, '{"cap_multiplier": 1.35, "daily_cap_limit": 2000, "badge": "platinum_megaphone"}'),
    (5, 'Brand Ambassador', 100000, '{"cap_multiplier": 1.5, "daily_cap_limit": 5000, "badge": "diamond_handshake"}'),
    (6, 'Viraz Champion', 500000, '{"cap_multiplier": 2.0, "daily_cap_limit": 10000, "badge": "ruby_crown"}');

-- 10.2 user_levels - User level progression
CREATE TABLE user_levels (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    current_level_id UUID NOT NULL REFERENCES levels(id),
    total_cap_earned INTEGER NOT NULL DEFAULT 0,
    next_level_id UUID REFERENCES levels(id),
    progress_percentage DECIMAL(5,2),
    achieved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10.3 level_history - Level change history
CREATE TABLE level_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    old_level_id UUID REFERENCES levels(id),
    new_level_id UUID NOT NULL REFERENCES levels(id),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10.4 achievements - Achievement definitions
CREATE TABLE achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) CHECK (category IN ('engagement', 'social', 'financial', 'milestone', 'special')),
    requirement_type VARCHAR(50) NOT NULL, -- 'cap_total', 'comments', 'shares', etc
    requirement_value INTEGER NOT NULL,
    reward_cap INTEGER DEFAULT 0,
    reward_badge VARCHAR(100),
    icon_url TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample achievements
INSERT INTO achievements (code, name, description, category, requirement_type, requirement_value, reward_cap) VALUES
    ('FIRST_BLOOD', 'First Blood', 'Earn your first 100 CAP', 'milestone', 'cap_total', 100, 50),
    ('SOCIAL_BUTTERFLY', 'Social Butterfly', 'Share 50 ads', 'social', 'shares', 50, 200),
    ('CRITIC', 'Critic', 'Post 100 comments', 'engagement', 'comments', 100, 300),
    ('TRENDSETTER', 'Trendsetter', 'Get 50 accepted suggestions', 'engagement', 'suggestions_accepted', 50, 500),
    ('NETWORKER', 'Networker', 'Refer 10 friends', 'social', 'referrals', 10, 2000),
    ('STREAK_MASTER', 'Streak Master', 'Maintain 100-day streak', 'milestone', 'streak_days', 100, 1000),
    ('EXPLORER', 'Explorer', 'Visit 100 unique brands', 'engagement', 'brands_visited', 100, 300);

-- 10.5 user_achievements - User earned achievements
CREATE TABLE user_achievements (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
    progress INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    reward_claimed BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (user_id, achievement_id)
);

-- 10.6 badges - Badge definitions
CREATE TABLE badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon_url TEXT,
    rarity VARCHAR(20) CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10.7 user_badges - Badges earned by users
CREATE TABLE user_badges (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_featured BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (user_id, badge_id)
);

-- 10.8 leaderboards - Leaderboard definitions
CREATE TABLE leaderboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) CHECK (type IN ('global', 'weekly', 'monthly', 'brand', 'category')),
    metric VARCHAR(50) CHECK (metric IN ('cap_earned', 'engagements', 'referrals', 'suggestions')),
    period VARCHAR(20) CHECK (period IN ('all_time', 'weekly', 'monthly')),
    reset_schedule VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10.9 leaderboard_entries - Leaderboard rankings
CREATE TABLE leaderboard_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leaderboard_id UUID NOT NULL REFERENCES leaderboards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score NUMERIC NOT NULL,
    rank INTEGER NOT NULL,
    metadata JSONB,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(leaderboard_id, user_id, period_start, period_end)
);

-- 10.10 missions - Weekly challenges/missions
CREATE TABLE missions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    mission_type VARCHAR(50) CHECK (mission_type IN ('daily', 'weekly', 'special')),
    requirements JSONB NOT NULL,
    rewards JSONB NOT NULL,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    max_completions INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10.11 user_missions - User mission progress
CREATE TABLE user_missions (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    mission_id UUID REFERENCES missions(id) ON DELETE CASCADE,
    progress INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    reward_claimed BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (user_id, mission_id)
);

-- 10.12 referral_rewards - Referral reward tracking
CREATE TABLE referral_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referred_id UUID REFERENCES users(id) ON DELETE SET NULL,
    tier INTEGER DEFAULT 1,
    amount INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Gamification domain
CREATE INDEX idx_user_levels_current ON user_levels(current_level_id);
CREATE INDEX idx_user_achievements_completed ON user_achievements(user_id) WHERE completed = TRUE;
CREATE INDEX idx_leaderboard_entries_rank ON leaderboard_entries(leaderboard_id, rank);
CREATE INDEX idx_user_missions_active ON user_missions(user_id) WHERE completed = FALSE;


-- =====================================================
-- DOMAIN 11: ANALYTICS & METRICS
-- =====================================================

-- 11.1 analytics_events - Raw analytics events
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES users(id),
    session_id UUID REFERENCES user_sessions(id),
    properties JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11.2 event_types - Available event types
CREATE TABLE event_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50),
    description TEXT
);

-- 11.3 user_metrics - Daily user metrics
CREATE TABLE user_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    sessions_count INTEGER DEFAULT 0,
    time_spent_minutes INTEGER DEFAULT 0,
    engagements_count INTEGER DEFAULT 0,
    cap_earned INTEGER DEFAULT 0,
    cap_spent INTEGER DEFAULT 0,
    ads_viewed INTEGER DEFAULT 0,
    rooms_joined INTEGER DEFAULT 0,
    comments_posted INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, date)
);

-- 11.4 campaign_metrics - Campaign performance metrics
CREATE TABLE campaign_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    ctr DECIMAL(5,2) GENERATED ALWAYS AS (CASE WHEN impressions > 0 THEN (clicks::DECIMAL / impressions * 100) ELSE 0 END) STORED,
    engagements INTEGER DEFAULT 0,
    engagement_rate DECIMAL(5,2),
    cap_spent INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    conversion_value NUMERIC DEFAULT 0,
    reach INTEGER DEFAULT 0,
    frequency DECIMAL(5,2),
    UNIQUE(campaign_id, date)
);

-- 11.5 ad_metrics - Ad performance metrics
CREATE TABLE ad_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    impressions INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    ctr DECIMAL(5,2) GENERATED ALWAYS AS (CASE WHEN impressions > 0 THEN (clicks::DECIMAL / impressions * 100) ELSE 0 END) STORED,
    engagements INTEGER DEFAULT 0,
    cap_earned INTEGER DEFAULT 0,
    avg_view_duration INTEGER,
    completion_rate DECIMAL(5,2),
    UNIQUE(ad_id, date)
);

-- 11.6 room_metrics - Room performance metrics
CREATE TABLE room_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_participants INTEGER DEFAULT 0,
    peak_participants INTEGER DEFAULT 0,
    avg_participants INTEGER DEFAULT 0,
    messages_count INTEGER DEFAULT 0,
    engagements_count INTEGER DEFAULT 0,
    duration_minutes INTEGER DEFAULT 0,
    UNIQUE(room_id, date)
);

-- 11.7 conversion_metrics - Conversion tracking
CREATE TABLE conversion_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(id),
    ad_id UUID REFERENCES ads(id),
    user_id UUID REFERENCES users(id),
    conversion_type VARCHAR(50) NOT NULL,
    conversion_value NUMERIC,
    attributed_cap INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11.8 traffic_sources - Traffic source tracking
CREATE TABLE traffic_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source VARCHAR(100) NOT NULL,
    medium VARCHAR(100),
    campaign VARCHAR(255),
    content VARCHAR(255),
    visits INTEGER DEFAULT 0,
    date DATE NOT NULL,
    UNIQUE(source, medium, campaign, date)
);

-- 11.9 daily_reports - Daily summary reports
CREATE TABLE daily_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_date DATE UNIQUE NOT NULL,
    new_users INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    total_cap_earned INTEGER DEFAULT 0,
    total_cap_spent INTEGER DEFAULT 0,
    total_deposits NUMERIC DEFAULT 0,
    total_withdrawals NUMERIC DEFAULT 0,
    total_impressions INTEGER DEFAULT 0,
    total_clicks INTEGER DEFAULT 0,
    total_engagements INTEGER DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    total_revenue NUMERIC DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11.10 monthly_reports - Monthly summary reports
CREATE TABLE monthly_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_year INTEGER NOT NULL,
    report_month INTEGER NOT NULL,
    new_users INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    retained_users INTEGER DEFAULT 0,
    churned_users INTEGER DEFAULT 0,
    total_cap_earned INTEGER DEFAULT 0,
    total_cap_spent INTEGER DEFAULT 0,
    total_deposits NUMERIC DEFAULT 0,
    total_withdrawals NUMERIC DEFAULT 0,
    total_revenue NUMERIC DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(report_year, report_month)
);

-- Indexes for Analytics domain
CREATE INDEX idx_analytics_events_user_time ON analytics_events(user_id, timestamp);
CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX idx_user_metrics_user_date ON user_metrics(user_id, date);
CREATE INDEX idx_campaign_metrics_campaign ON campaign_metrics(campaign_id, date);
CREATE INDEX idx_daily_reports_date ON daily_reports(report_date);


-- =====================================================
-- DOMAIN 12: TRUST & SAFETY
-- =====================================================

-- 12.1 reports - Content/user reports
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_user_id UUID REFERENCES users(id),
    reported_content_type VARCHAR(50) CHECK (reported_content_type IN ('ad', 'room', 'comment', 'message', 'product', 'profile')),
    reported_content_id UUID,
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('spam', 'harassment', 'hate_speech', 'violence', 'adult', 'scam', 'fake', 'copyright', 'other')),
    description TEXT,
    evidence_urls TEXT[],
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
    assigned_to UUID REFERENCES users(id),
    resolved_by UUID REFERENCES users(id),
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

-- 12.2 report_types - Report type definitions
CREATE TABLE report_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    severity INTEGER DEFAULT 1,
    auto_moderate BOOLEAN DEFAULT FALSE
);

-- 12.3 report_evidence - Evidence for reports
CREATE TABLE report_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    evidence_type VARCHAR(50) CHECK (evidence_type IN ('screenshot', 'video', 'link', 'text')),
    evidence_url TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12.4 moderation_actions - Actions taken by moderators
CREATE TABLE moderation_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    moderator_id UUID NOT NULL REFERENCES users(id),
    target_user_id UUID REFERENCES users(id),
    target_content_type VARCHAR(50),
    target_content_id UUID,
    action_type VARCHAR(50) CHECK (action_type IN ('warning', 'mute', 'suspend', 'ban', 'content_removal', 'account_restriction')),
    duration INTEGER, -- In hours, NULL for permanent
    reason TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- 12.5 fraud_alerts - Automated fraud detection alerts
CREATE TABLE fraud_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('multiple_accounts', 'click_farming', 'bot_behavior', 'unusual_pattern', 'payment_fraud')),
    user_id UUID REFERENCES users(id),
    ip_address INET,
    device_fingerprint VARCHAR(255),
    score INTEGER CHECK (score BETWEEN 0 AND 100),
    details JSONB,
    status VARCHAR(20) DEFAULT 'new' CHECK (status IN ('new', 'investigating', 'confirmed', 'false_positive')),
    assigned_to UUID REFERENCES users(id),
    resolved_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

-- 12.6 fraud_rules - Rules for fraud detection
CREATE TABLE fraud_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name VARCHAR(100) NOT NULL,
    rule_type VARCHAR(50) NOT NULL,
    conditions JSONB NOT NULL,
    action VARCHAR(50) CHECK (action IN ('flag', 'block', 'review', 'notify')),
    priority INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12.7 blacklisted_users - Permanently banned users
CREATE TABLE blacklisted_users (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    blacklisted_by UUID REFERENCES users(id),
    blacklisted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12.8 blacklisted_devices - Blocked devices
CREATE TABLE blacklisted_devices (
    device_fingerprint VARCHAR(255) PRIMARY KEY,
    reason TEXT,
    blacklisted_by UUID REFERENCES users(id),
    blacklisted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12.9 blocked_ips - Blocked IP addresses
CREATE TABLE blocked_ips (
    ip_address INET PRIMARY KEY,
    reason TEXT,
    blocked_by UUID REFERENCES users(id),
    blocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- 12.10 content_flags - Automated content flags
CREATE TABLE content_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type VARCHAR(50) NOT NULL,
    content_id UUID NOT NULL,
    flag_type VARCHAR(50) CHECK (flag_type IN ('profanity', 'hate_speech', 'spam', 'personal_info', 'adult')),
    confidence DECIMAL(5,2),
    review_status VARCHAR(20) DEFAULT 'pending' CHECK (review_status IN ('pending', 'reviewed', 'auto_approved', 'auto_rejected')),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Trust & Safety domain
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_reporter ON reports(reporter_id);
CREATE INDEX idx_fraud_alerts_status ON fraud_alerts(status);
CREATE INDEX idx_moderation_actions_user ON moderation_actions(target_user_id);
CREATE INDEX idx_content_flags_status ON content_flags(review_status);


-- =====================================================
-- DOMAIN 13: PAYMENT & FINANCIAL
-- =====================================================

-- 13.1 payment_methods - User payment methods
CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    method_type VARCHAR(50) CHECK (method_type IN ('card', 'bank', 'mobile_money', 'paypal', 'crypto')),
    provider VARCHAR(100),
    account_last4 VARCHAR(4),
    card_brand VARCHAR(50),
    card_expiry_month INTEGER,
    card_expiry_year INTEGER,
    bank_name VARCHAR(255),
    bank_account_number VARCHAR(255), -- Encrypted
    bank_routing_number VARCHAR(255), -- Encrypted
    mobile_provider VARCHAR(50),
    mobile_number VARCHAR(20), -- Encrypted
    is_default BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13.2 payment_transactions - Payment gateway transactions
CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    payment_method_id UUID REFERENCES payment_methods(id),
    transaction_type VARCHAR(50) CHECK (transaction_type IN ('deposit', 'withdrawal', 'refund', 'payout')),
    amount NUMERIC NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    fee_amount NUMERIC DEFAULT 0,
    net_amount NUMERIC GENERATED ALWAYS AS (amount - fee_amount) STORED,
    provider VARCHAR(50),
    provider_transaction_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded')),
    error_code VARCHAR(100),
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- 13.3 payment_providers - Configured payment providers
CREATE TABLE payment_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    provider_type VARCHAR(50) CHECK (provider_type IN ('stripe', 'paypal', 'flutterwave', 'paystack', 'selcom', 'other')),
    is_active BOOLEAN DEFAULT TRUE,
    config JSONB, -- API keys, endpoints (encrypted)
    supported_currencies VARCHAR(10)[],
    supported_methods VARCHAR(50)[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13.4 payment_invoices - Invoices for transactions
CREATE TABLE payment_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID UNIQUE NOT NULL REFERENCES payment_transactions(id),
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    invoice_url TEXT,
    pdf_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13.5 payment_refunds - Refund tracking
CREATE TABLE payment_refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_transaction_id UUID NOT NULL REFERENCES payment_transactions(id),
    amount NUMERIC NOT NULL,
    reason VARCHAR(255),
    provider_refund_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending',
    processed_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);

-- 13.6 payment_disputes - Chargebacks/disputes
CREATE TABLE payment_disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES payment_transactions(id),
    dispute_reason VARCHAR(255),
    amount NUMERIC NOT NULL,
    status VARCHAR(20) DEFAULT 'open',
    evidence_deadline TIMESTAMP,
    evidence_submitted JSONB,
    resolution VARCHAR(50),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13.7 tax_records - Tax information
CREATE TABLE tax_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    tax_id VARCHAR(100),
    tax_country VARCHAR(100),
    tax_type VARCHAR(50) CHECK (tax_type IN ('vat', 'gst', 'sales_tax', 'income_tax')),
    tax_rate DECIMAL(5,2),
    exemption_certificate TEXT,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13.8 financial_ledgers - Double-entry accounting ledger
CREATE TABLE financial_ledgers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_date DATE NOT NULL,
    account_code VARCHAR(20) NOT NULL,
    account_name VARCHAR(100) NOT NULL,
    debit NUMERIC DEFAULT 0,
    credit NUMERIC DEFAULT 0,
    balance NUMERIC GENERATED ALWAYS AS (debit - credit) STORED,
    reference_type VARCHAR(50),
    reference_id UUID,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13.9 withdrawal_requests - User withdrawal requests
CREATE TABLE withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    wallet_id UUID NOT NULL REFERENCES cap_wallets(id),
    amount_cap INTEGER NOT NULL,
    amount_fiat NUMERIC NOT NULL,
    exchange_rate NUMERIC NOT NULL,
    fee_amount NUMERIC DEFAULT 0,
    net_amount NUMERIC GENERATED ALWAYS AS (amount_fiat - fee_amount) STORED,
    payment_method_id UUID REFERENCES payment_methods(id),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'rejected', 'cancelled')),
    admin_notes TEXT,
    processed_by UUID REFERENCES users(id),
    processed_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13.10 payout_accounts - Sponsor payout accounts
CREATE TABLE payout_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sponsor_id UUID NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
    account_type VARCHAR(50) CHECK (account_type IN ('bank', 'mobile_money', 'paypal')),
    account_details JSONB NOT NULL, -- Encrypted
    is_default BOOLEAN DEFAULT FALSE,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13.11 payout_transactions - Sponsor payouts
CREATE TABLE payout_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sponsor_id UUID NOT NULL REFERENCES sponsors(id),
    payout_account_id UUID REFERENCES payout_accounts(id),
    amount NUMERIC NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    period_start DATE,
    period_end DATE,
    status VARCHAR(20) DEFAULT 'pending',
    provider_transaction_id VARCHAR(255),
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13.12 financial_reports - Generated financial reports
CREATE TABLE financial_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type VARCHAR(50) NOT NULL,
    report_date DATE NOT NULL,
    report_data JSONB NOT NULL,
    generated_by UUID REFERENCES users(id),
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Payment domain
CREATE INDEX idx_payment_transactions_user ON payment_transactions(user_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_withdrawal_requests_status ON withdrawal_requests(status);
CREATE INDEX idx_financial_ledgers_date ON financial_ledgers(entry_date);
CREATE INDEX idx_payment_methods_user ON payment_methods(user_id);


-- =====================================================
-- DOMAIN 14: ADMIN & SYSTEM
-- =====================================================

-- 14.1 admins - Admin users
CREATE TABLE admins (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    department VARCHAR(100),
    job_title VARCHAR(100),
    permissions_level INTEGER DEFAULT 1,
    last_active TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14.2 admin_roles - Admin roles
CREATE TABLE admin_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14.3 admin_role_assignments - Admin role assignments
CREATE TABLE admin_role_assignments (
    admin_id UUID REFERENCES admins(user_id) ON DELETE CASCADE,
    role_id UUID REFERENCES admin_roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (admin_id, role_id)
);

-- 14.4 system_settings - Global system settings
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(255) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_type VARCHAR(50) CHECK (setting_type IN ('string', 'integer', 'boolean', 'json', 'float')),
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
    ('platform.name', 'Viraz', 'string', 'Platform name'),
    ('platform.url', 'https://viraz.com', 'string', 'Platform URL'),
    ('cap.initial_value', '0.01', 'float', 'Initial CAP to USD value'),
    ('cap.decay_rate_12m', '10', 'integer', 'Decay rate after 12 months (%)'),
    ('cap.decay_rate_24m', '25', 'integer', 'Decay rate after 24 months (%)'),
    ('withdrawal.min_amount', '10', 'integer', 'Minimum withdrawal amount in USD'),
    ('withdrawal.fee_percentage', '2', 'integer', 'Withdrawal fee percentage'),
    ('email.verification_required', 'true', 'boolean', 'Require email verification'),
    ('phone.verification_required', 'true', 'boolean', 'Require phone verification'),
    ('maintenance.mode', 'false', 'boolean', 'Maintenance mode status');

-- 14.5 feature_flags - Feature toggle system
CREATE TABLE feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flag_name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    enabled BOOLEAN DEFAULT FALSE,
    enabled_for_roles JSONB, -- Specific user roles
    enabled_for_percentage INTEGER, -- 0-100
    conditions JSONB,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14.6 system_logs - System-level logs
CREATE TABLE system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_level VARCHAR(20) CHECK (log_level IN ('debug', 'info', 'warning', 'error', 'critical')),
    component VARCHAR(100),
    message TEXT,
    details JSONB,
    ip_address INET,
    user_id UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14.7 error_logs - Application errors
CREATE TABLE error_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    error_code VARCHAR(100),
    error_message TEXT,
    stack_trace TEXT,
    request_url TEXT,
    request_method VARCHAR(10),
    request_params JSONB,
    request_headers JSONB,
    user_id UUID REFERENCES users(id),
    session_id UUID REFERENCES user_sessions(id),
    ip_address INET,
    user_agent TEXT,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14.8 maintenance_logs - Scheduled maintenance records
CREATE TABLE maintenance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    performed_by UUID REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14.9 job_queue - Background job queue
CREATE TABLE job_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type VARCHAR(100) NOT NULL,
    job_data JSONB,
    priority INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    error_message TEXT,
    scheduled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14.10 job_history - Job execution history
CREATE TABLE job_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES job_queue(id),
    job_type VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL,
    execution_time INTEGER, -- In milliseconds
    result JSONB,
    error TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Admin domain
CREATE INDEX idx_system_settings_key ON system_settings(setting_key);
CREATE INDEX idx_system_logs_level ON system_logs(log_level, created_at);
CREATE INDEX idx_error_logs_created ON error_logs(created_at);
CREATE INDEX idx_job_queue_status ON job_queue(status, priority);


-- =====================================================
-- DOMAIN 15: AI & RECOMMENDATION ENGINE
-- =====================================================

-- 15.1 recommendation_models - ML model metadata
CREATE TABLE recommendation_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name VARCHAR(100) UNIQUE NOT NULL,
    model_version VARCHAR(50) NOT NULL,
    model_type VARCHAR(50) CHECK (model_type IN ('collaborative_filtering', 'content_based', 'hybrid', 'trending')),
    accuracy DECIMAL(5,2),
    training_date TIMESTAMP,
    training_duration INTEGER, -- In seconds
    training_data_size INTEGER,
    model_path TEXT,
    is_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 15.2 user_embeddings - User vector embeddings for recommendations
CREATE TABLE user_embeddings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    embedding vector(128), -- 128-dimension vector
    model_id UUID REFERENCES recommendation_models(id),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- 15.3 item_embeddings - Item (ad/product) embeddings
CREATE TABLE item_embeddings (
    item_id UUID NOT NULL,
    item_type VARCHAR(20) CHECK (item_type IN ('ad', 'product', 'brand', 'room')),
    embedding vector(128),
    model_id UUID REFERENCES recommendation_models(id),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (item_id, item_type)
);

-- 15.4 user_interests - User interest profiles
CREATE TABLE user_interests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES ad_categories(id),
    interest_score DECIMAL(5,2) DEFAULT 0,
    confidence DECIMAL(5,2),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, category_id)
);

-- 15.5 user_behavior_vectors - User behavior patterns
CREATE TABLE user_behavior_vectors (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    engagement_pattern JSONB,
    time_preferences JSONB,
    content_preferences JSONB,
    purchase_pattern JSONB,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 15.6 content_similarity - Pre-computed content similarity
CREATE TABLE content_similarity (
    source_id UUID NOT NULL,
    source_type VARCHAR(20) NOT NULL,
    target_id UUID NOT NULL,
    target_type VARCHAR(20) NOT NULL,
    similarity_score DECIMAL(5,2) NOT NULL,
    model_id UUID REFERENCES recommendation_models(id),
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (source_id, source_type, target_id, target_type)
);

-- 15.7 ad_ranking_scores - Real-time ad ranking scores
CREATE TABLE ad_ranking_scores (
    ad_id UUID REFERENCES ads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    rank_score DECIMAL(10,4) NOT NULL,
    factors JSONB,
    expires_at TIMESTAMP,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (ad_id, user_id)
);

-- 15.8 personalization_settings - Per-user personalization config
CREATE TABLE personalization_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    enable_personalization BOOLEAN DEFAULT TRUE,
    privacy_level VARCHAR(20) DEFAULT 'balanced' CHECK (privacy_level IN ('high', 'balanced', 'low')),
    explicit_feedback JSONB, -- User likes/dislikes for categories
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 15.9 recommendation_logs - Log of recommendations shown
CREATE TABLE recommendation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recommended_item_id UUID NOT NULL,
    recommended_item_type VARCHAR(20) NOT NULL,
    recommendation_type VARCHAR(50),
    rank_position INTEGER,
    was_clicked BOOLEAN DEFAULT FALSE,
    was_engaged BOOLEAN DEFAULT FALSE,
    click_time TIMESTAMP,
    engagement_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 15.10 model_training_logs - Logs of model training
CREATE TABLE model_training_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES recommendation_models(id),
    training_status VARCHAR(20) CHECK (training_status IN ('started', 'in_progress', 'completed', 'failed')),
    training_metrics JSONB,
    error_message TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Indexes for AI domain
CREATE INDEX idx_user_embeddings_user ON user_embeddings(user_id);
CREATE INDEX idx_recommendation_logs_user ON recommendation_logs(user_id, created_at);
CREATE INDEX idx_content_similarity_source ON content_similarity(source_id, source_type);
CREATE INDEX idx_ad_ranking_scores_user ON ad_ranking_scores(user_id, rank_score DESC);


-- Example RLS for cap_wallets
ALTER TABLE cap_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_wallet_access ON cap_wallets
    USING (user_id = current_user_id() OR 
           EXISTS (SELECT 1 FROM admins WHERE user_id = current_user_id()));

-- Example RLS for user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profile_access ON user_profiles
    USING (user_id = current_user_id() OR 
           EXISTS (SELECT 1 FROM admins WHERE user_id = current_user_id()));


           -- Encrypted columns using pgcrypto
CREATE EXTENSION pgcrypto;

-- Example: Encrypt sensitive data
UPDATE payment_methods 
SET bank_account_number = pgp_sym_encrypt(bank_account_number, current_setting('app.encryption_key'));


-- Audit trigger for sensitive tables
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (user_id, action, resource_type, resource_id, old_values, new_values)
    VALUES (
        current_user_id(),
        TG_OP,
        TG_TABLE_NAME,
        NEW.id,
        CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END,
        row_to_json(NEW)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_cap_wallets
    AFTER INSERT OR UPDATE OR DELETE ON cap_wallets
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();


    -- Composite indexes for common queries
CREATE INDEX idx_engagements_user_target ON user_engagements(user_id, target_type, target_id);
CREATE INDEX idx_transactions_wallet_created ON cap_transactions(wallet_id, created_at DESC);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read, created_at DESC);

-- Partial indexes for active data
CREATE INDEX idx_active_sessions ON user_sessions(user_id) WHERE is_active = TRUE;
CREATE INDEX idx_pending_withdrawals ON cap_withdrawals(user_id) WHERE status = 'pending';

-- GiST indexes for geospatial queries
CREATE INDEX idx_locations_coordinates ON user_locations USING GIST (coordinates);
CREATE INDEX idx_brand_locations_coordinates ON brand_locations USING GIST (coordinates);

-- Partition large tables by date
CREATE TABLE cap_transactions_partitioned (
    LIKE cap_transactions INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE cap_transactions_2024_01 PARTITION OF cap_transactions_partitioned
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');


    -- Recommended pooler configuration (PgBouncer)
-- INI style configuration for pgbouncer.ini
[databases]
viraz = host=localhost port=5432 dbname=viraz

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 50