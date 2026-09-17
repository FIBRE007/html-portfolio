PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS clubs (
  name TEXT PRIMARY KEY,
  group_key TEXT NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS registrations (
  id TEXT PRIMARY KEY,
  session TEXT NOT NULL,
  term TEXT NOT NULL,
  learner_key TEXT NOT NULL,
  student_name TEXT NOT NULL,
  section TEXT NOT NULL,
  class_level TEXT NOT NULL,
  club_name TEXT NOT NULL REFERENCES clubs(name),
  guardian_name TEXT NOT NULL,
  guardian_phone TEXT NOT NULL,
  guardian_email TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','WITHDRAWN')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  withdrawn_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS one_active_club_per_learner_term
ON registrations(session, term, learner_key)
WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS registrations_club_term_index
ON registrations(session, term, club_name, status);

CREATE INDEX IF NOT EXISTS registrations_created_index
ON registrations(created_at DESC);

CREATE TRIGGER IF NOT EXISTS prevent_club_over_capacity
BEFORE INSERT ON registrations
WHEN NEW.status = 'ACTIVE'
 AND (
   SELECT COUNT(*)
   FROM registrations
   WHERE session = NEW.session
     AND term = NEW.term
     AND club_name = NEW.club_name
     AND status = 'ACTIVE'
 ) >= (
   SELECT capacity FROM clubs WHERE name = NEW.club_name
 )
BEGIN
  SELECT RAISE(ABORT, 'CLUB_FULL');
END;

INSERT INTO clubs(name, group_key, capacity, active, sort_order) VALUES
('Boys Scout','general',40,1,10),
('Drama Club','general',30,1,20),
('Foreign Languages Club','general',25,1,30),
('Girl Guide / Brownie Club','general',40,1,40),
('JEC Club','general',25,1,50),
('JET Club','general',35,1,60),
('Knowledge Empowerment Club','general',25,1,70),
('Literary & Debating Club','general',30,1,80),
('Maths Club','general',35,1,90),
('Nigerian Languages Club','general',25,1,100),
('Red Cross Club','general',35,1,110),
('Young Farmers Club','general',25,1,120),
('Fine Arts Club (Upper Primary)','upper-primary',40,1,210),
('Home Makers Club','upper-primary',35,1,220),
('ICT Club (Upper Primary)','upper-primary',25,1,230),
('Music Club (Upper Primary)','upper-primary',40,1,240),
('Fine Arts Club (Lower Primary)','lower-primary',35,1,310),
('Home Makers Club (Lower Primary)','lower-primary',35,1,320),
('ICT Club (Lower Primary)','lower-primary',35,1,330),
('Music Club (Lower Primary)','lower-primary',35,1,340),
('Fine Arts Club (Nursery)','nursery',20,1,410),
('ICT Club (Nursery)','nursery',20,1,420),
('JEC Club (Nursery)','nursery',15,1,430),
('Knowledge Empowerment Club (Nursery)','nursery',15,1,440),
('Languages Club (Nursery)','nursery',15,1,450)
ON CONFLICT(name) DO UPDATE SET
  group_key = excluded.group_key,
  capacity = excluded.capacity,
  sort_order = excluded.sort_order;
