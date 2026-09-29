-- PostGIS is kept in its own schema on Supabase.
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

CREATE TABLE wards (
    id        INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name      VARCHAR(100) NOT NULL UNIQUE,
    boundary  extensions.geometry(MultiPolygon, 4326) NOT NULL
);
CREATE INDEX idx_wards_boundary ON wards USING GIST (boundary);

-- Login credentials live in Supabase Auth. This table stores the pilot profile.
CREATE TABLE staff (
    id          UUID PRIMARY KEY REFERENCES auth.users(id),
    full_name   VARCHAR(100) NOT NULL,
    role        VARCHAR(20)  NOT NULL CHECK (role IN ('OFFICER', 'VERIFIER')),
    ward_id     INT REFERENCES wards(id),
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT officer_has_ward CHECK (role <> 'OFFICER' OR ward_id IS NOT NULL)
);

CREATE TABLE categories (
    id          INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code        VARCHAR(40)  NOT NULL UNIQUE,
    name        VARCHAR(100) NOT NULL,
    reportable  BOOLEAN      NOT NULL DEFAULT FALSE
);

CREATE TABLE tickets (
    id                   INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    public_code          VARCHAR(12)  NOT NULL UNIQUE,
    category_id          INT          NOT NULL REFERENCES categories(id),
    description          VARCHAR(300) NOT NULL,
    lat                  DOUBLE PRECISION NOT NULL CHECK (lat BETWEEN -90 AND 90),
    lng                  DOUBLE PRECISION NOT NULL CHECK (lng BETWEEN -180 AND 180),
    location             extensions.geography(Point, 4326)
                         GENERATED ALWAYS AS (
                             extensions.ST_SetSRID(extensions.ST_MakePoint(lng, lat), 4326)::extensions.geography
                         ) STORED,
    street               VARCHAR(200),
    area                 VARCHAR(200),
    ward_id              INT REFERENCES wards(id),
    status               VARCHAR(30)  NOT NULL DEFAULT 'SUBMITTED'
                         CHECK (status IN ('SUBMITTED', 'OPEN', 'IN_PROGRESS',
                                           'PENDING_VERIFICATION', 'CLOSED',
                                           'REOPENED', 'REJECTED')),
    assigned_officer_id  UUID REFERENCES staff(id),
    support_count        INT          NOT NULL DEFAULT 1,
    is_demo              BOOLEAN      NOT NULL DEFAULT FALSE,
    closed_by            UUID REFERENCES staff(id),
    closed_at            TIMESTAMPTZ,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT closed_needs_verifier
        CHECK (status <> 'CLOSED' OR (closed_by IS NOT NULL AND closed_at IS NOT NULL))
);
CREATE INDEX idx_tickets_location        ON tickets USING GIST (location);
CREATE INDEX idx_tickets_ward_status     ON tickets (ward_id, status);
CREATE INDEX idx_tickets_officer_status  ON tickets (assigned_officer_id, status);
CREATE INDEX idx_tickets_created         ON tickets (created_at);

CREATE TABLE action_reports (
    id               INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ticket_id        INT           NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    officer_id       UUID          NOT NULL REFERENCES staff(id),
    remarks          VARCHAR(1000) NOT NULL,
    lat              DOUBLE PRECISION,
    lng              DOUBLE PRECISION,
    submitted_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    decision         VARCHAR(10)   CHECK (decision IN ('APPROVED', 'REJECTED')),
    decided_by       UUID REFERENCES staff(id),
    decided_at       TIMESTAMPTZ,
    decision_reason  VARCHAR(500),
    CONSTRAINT rejection_needs_reason
        CHECK (decision IS DISTINCT FROM 'REJECTED' OR decision_reason IS NOT NULL)
);
CREATE INDEX idx_action_reports_ticket ON action_reports (ticket_id);

CREATE TABLE media (
    id                INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ticket_id         INT           NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    action_report_id  INT REFERENCES action_reports(id) ON DELETE CASCADE,
    type              VARCHAR(10)   NOT NULL CHECK (type IN ('ORIGINAL', 'ACTION')),
    storage_path      VARCHAR(300)  NOT NULL,
    content_type      VARCHAR(50)   NOT NULL,
    size_bytes        INT           NOT NULL,
    lat               DOUBLE PRECISION,
    lng               DOUBLE PRECISION,
    captured_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT media_type_matches_report
        CHECK ((type = 'ORIGINAL' AND action_report_id IS NULL)
            OR (type = 'ACTION'   AND action_report_id IS NOT NULL))
);
CREATE INDEX idx_media_ticket ON media (ticket_id);

CREATE TABLE status_history (
    id           INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ticket_id    INT         NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    from_status  VARCHAR(30),
    to_status    VARCHAR(30) NOT NULL,
    changed_by   UUID REFERENCES staff(id),
    reason       VARCHAR(500),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_status_history_ticket ON status_history (ticket_id);

-- Express uses the database owner connection. The public anon key gets no policies.
ALTER TABLE wards           ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff           ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets         ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_reports  ENABLE ROW LEVEL SECURITY;
ALTER TABLE media           ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_history  ENABLE ROW LEVEL SECURITY;
