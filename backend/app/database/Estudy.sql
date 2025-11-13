--
-- PostgreSQL database dump
--

\restrict 5mtRqkefuckaeEtYfN0cVneKmo8CwaaVrmutMoUDseRAzafzdcNOvrUoQjyeU3g

-- Dumped from database version 18.0
-- Dumped by pg_dump version 18.0

-- Started on 2025-11-11 17:52:20

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 222 (class 1259 OID 16639)
-- Name: User; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."User" (
    user_id integer NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(150) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role_id integer,
    CONSTRAINT "User_email_check" CHECK ((POSITION(('@'::text) IN (email)) > 1)),
    CONSTRAINT "User_name_check" CHECK ((char_length((name)::text) >= 2)),
    CONSTRAINT "User_password_hash_check" CHECK ((char_length((password_hash)::text) >= 10))
);


ALTER TABLE public."User" OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 16638)
-- Name: User_user_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."User_user_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."User_user_id_seq" OWNER TO postgres;

--
-- TOC entry 5196 (class 0 OID 0)
-- Dependencies: 221
-- Name: User_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."User_user_id_seq" OWNED BY public."User".user_id;


--
-- TOC entry 245 (class 1259 OID 16878)
-- Name: aisuggestion; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.aisuggestion (
    suggestion_id integer NOT NULL,
    user_id integer NOT NULL,
    recommended_set_id integer NOT NULL,
    difficulty_level character varying(50)
);


ALTER TABLE public.aisuggestion OWNER TO postgres;

--
-- TOC entry 244 (class 1259 OID 16877)
-- Name: aisuggestion_suggestion_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.aisuggestion_suggestion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.aisuggestion_suggestion_id_seq OWNER TO postgres;

--
-- TOC entry 5197 (class 0 OID 0)
-- Dependencies: 244
-- Name: aisuggestion_suggestion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.aisuggestion_suggestion_id_seq OWNED BY public.aisuggestion.suggestion_id;


--
-- TOC entry 243 (class 1259 OID 16858)
-- Name: analyticsevent; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.analyticsevent (
    event_id integer NOT NULL,
    user_id integer NOT NULL,
    event_type character varying(100) NOT NULL,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    metadata text,
    CONSTRAINT analyticsevent_event_type_check CHECK ((char_length((event_type)::text) > 0))
);


ALTER TABLE public.analyticsevent OWNER TO postgres;

--
-- TOC entry 242 (class 1259 OID 16857)
-- Name: analyticsevent_event_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.analyticsevent_event_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.analyticsevent_event_id_seq OWNER TO postgres;

--
-- TOC entry 5198 (class 0 OID 0)
-- Dependencies: 242
-- Name: analyticsevent_event_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.analyticsevent_event_id_seq OWNED BY public.analyticsevent.event_id;


--
-- TOC entry 233 (class 1259 OID 16752)
-- Name: attempt; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.attempt (
    attempt_id integer NOT NULL,
    user_id integer NOT NULL,
    set_id integer NOT NULL,
    score double precision,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT attempt_score_check CHECK (((score >= (0)::double precision) AND (score <= (100)::double precision)))
);


ALTER TABLE public.attempt OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 16751)
-- Name: attempt_attempt_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.attempt_attempt_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.attempt_attempt_id_seq OWNER TO postgres;

--
-- TOC entry 5199 (class 0 OID 0)
-- Dependencies: 232
-- Name: attempt_attempt_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.attempt_attempt_id_seq OWNED BY public.attempt.attempt_id;


--
-- TOC entry 237 (class 1259 OID 16802)
-- Name: badge; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.badge (
    badge_id integer NOT NULL,
    name character varying(100) NOT NULL,
    criteria text NOT NULL,
    CONSTRAINT badge_criteria_check CHECK ((criteria <> ''::text)),
    CONSTRAINT badge_name_check CHECK ((char_length((name)::text) > 0))
);


ALTER TABLE public.badge OWNER TO postgres;

--
-- TOC entry 236 (class 1259 OID 16801)
-- Name: badge_badge_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.badge_badge_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.badge_badge_id_seq OWNER TO postgres;

--
-- TOC entry 5200 (class 0 OID 0)
-- Dependencies: 236
-- Name: badge_badge_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.badge_badge_id_seq OWNED BY public.badge.badge_id;


--
-- TOC entry 225 (class 1259 OID 16674)
-- Name: class; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.class (
    class_id integer NOT NULL,
    class_name character varying(100) NOT NULL,
    teacher_id integer NOT NULL,
    CONSTRAINT class_class_name_check CHECK ((char_length((class_name)::text) > 0))
);


ALTER TABLE public.class OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 16673)
-- Name: class_class_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.class_class_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.class_class_id_seq OWNER TO postgres;

--
-- TOC entry 5201 (class 0 OID 0)
-- Dependencies: 224
-- Name: class_class_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.class_class_id_seq OWNED BY public.class.class_id;


--
-- TOC entry 227 (class 1259 OID 16691)
-- Name: enrollment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.enrollment (
    enrollment_id integer NOT NULL,
    user_id integer NOT NULL,
    class_id integer NOT NULL
);


ALTER TABLE public.enrollment OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 16690)
-- Name: enrollment_enrollment_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.enrollment_enrollment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.enrollment_enrollment_id_seq OWNER TO postgres;

--
-- TOC entry 5202 (class 0 OID 0)
-- Dependencies: 226
-- Name: enrollment_enrollment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.enrollment_enrollment_id_seq OWNED BY public.enrollment.enrollment_id;


--
-- TOC entry 239 (class 1259 OID 16816)
-- Name: leaderboardentry; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.leaderboardentry (
    entry_id integer NOT NULL,
    user_id integer NOT NULL,
    score double precision,
    class_id integer,
    CONSTRAINT leaderboardentry_score_check CHECK (((score >= (0)::double precision) AND (score <= (100)::double precision)))
);


ALTER TABLE public.leaderboardentry OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 16815)
-- Name: leaderboardentry_entry_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.leaderboardentry_entry_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.leaderboardentry_entry_id_seq OWNER TO postgres;

--
-- TOC entry 5203 (class 0 OID 0)
-- Dependencies: 238
-- Name: leaderboardentry_entry_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.leaderboardentry_entry_id_seq OWNED BY public.leaderboardentry.entry_id;


--
-- TOC entry 241 (class 1259 OID 16838)
-- Name: notification; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notification (
    notification_id integer NOT NULL,
    user_id integer NOT NULL,
    message text NOT NULL,
    sent_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT notification_message_check CHECK ((char_length(message) > 0))
);


ALTER TABLE public.notification OWNER TO postgres;

--
-- TOC entry 240 (class 1259 OID 16837)
-- Name: notification_notification_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notification_notification_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notification_notification_id_seq OWNER TO postgres;

--
-- TOC entry 5204 (class 0 OID 0)
-- Dependencies: 240
-- Name: notification_notification_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notification_notification_id_seq OWNED BY public.notification.notification_id;


--
-- TOC entry 231 (class 1259 OID 16731)
-- Name: question; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.question (
    question_id integer NOT NULL,
    set_id integer NOT NULL,
    type character varying(50) NOT NULL,
    content text NOT NULL,
    correct_answer text NOT NULL,
    CONSTRAINT question_content_check CHECK ((content <> ''::text))
);


ALTER TABLE public.question OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 16730)
-- Name: question_question_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.question_question_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.question_question_id_seq OWNER TO postgres;

--
-- TOC entry 5205 (class 0 OID 0)
-- Dependencies: 230
-- Name: question_question_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.question_question_id_seq OWNED BY public.question.question_id;


--
-- TOC entry 220 (class 1259 OID 16627)
-- Name: role; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.role (
    role_id integer NOT NULL,
    role_name character varying(50) NOT NULL,
    CONSTRAINT role_role_name_check CHECK (((role_name)::text <> ''::text))
);


ALTER TABLE public.role OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 16626)
-- Name: role_role_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.role_role_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.role_role_id_seq OWNER TO postgres;

--
-- TOC entry 5206 (class 0 OID 0)
-- Dependencies: 219
-- Name: role_role_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.role_role_id_seq OWNED BY public.role.role_id;


--
-- TOC entry 229 (class 1259 OID 16713)
-- Name: studyset; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.studyset (
    set_id integer NOT NULL,
    title character varying(200) NOT NULL,
    subject character varying(100),
    creator_id integer NOT NULL,
    CONSTRAINT studyset_subject_check CHECK ((char_length((subject)::text) > 0)),
    CONSTRAINT studyset_title_check CHECK ((char_length((title)::text) > 1))
);


ALTER TABLE public.studyset OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 16712)
-- Name: studyset_set_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.studyset_set_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.studyset_set_id_seq OWNER TO postgres;

--
-- TOC entry 5207 (class 0 OID 0)
-- Dependencies: 228
-- Name: studyset_set_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.studyset_set_id_seq OWNED BY public.studyset.set_id;


--
-- TOC entry 223 (class 1259 OID 16662)
-- Name: teacher; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.teacher (
    teacher_id integer NOT NULL
);


ALTER TABLE public.teacher OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 16777)
-- Name: versionhistory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.versionhistory (
    version_id integer NOT NULL,
    set_id integer NOT NULL,
    editor_id integer NOT NULL,
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    diff text NOT NULL,
    CONSTRAINT versionhistory_diff_check CHECK ((diff <> ''::text))
);


ALTER TABLE public.versionhistory OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 16776)
-- Name: versionhistory_version_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.versionhistory_version_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.versionhistory_version_id_seq OWNER TO postgres;

--
-- TOC entry 5208 (class 0 OID 0)
-- Dependencies: 234
-- Name: versionhistory_version_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.versionhistory_version_id_seq OWNED BY public.versionhistory.version_id;


--
-- TOC entry 4921 (class 2604 OID 16642)
-- Name: User user_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User" ALTER COLUMN user_id SET DEFAULT nextval('public."User_user_id_seq"'::regclass);


--
-- TOC entry 4936 (class 2604 OID 16881)
-- Name: aisuggestion suggestion_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.aisuggestion ALTER COLUMN suggestion_id SET DEFAULT nextval('public.aisuggestion_suggestion_id_seq'::regclass);


--
-- TOC entry 4934 (class 2604 OID 16861)
-- Name: analyticsevent event_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.analyticsevent ALTER COLUMN event_id SET DEFAULT nextval('public.analyticsevent_event_id_seq'::regclass);


--
-- TOC entry 4926 (class 2604 OID 16755)
-- Name: attempt attempt_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attempt ALTER COLUMN attempt_id SET DEFAULT nextval('public.attempt_attempt_id_seq'::regclass);


--
-- TOC entry 4930 (class 2604 OID 16805)
-- Name: badge badge_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.badge ALTER COLUMN badge_id SET DEFAULT nextval('public.badge_badge_id_seq'::regclass);


--
-- TOC entry 4922 (class 2604 OID 16677)
-- Name: class class_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class ALTER COLUMN class_id SET DEFAULT nextval('public.class_class_id_seq'::regclass);


--
-- TOC entry 4923 (class 2604 OID 16694)
-- Name: enrollment enrollment_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enrollment ALTER COLUMN enrollment_id SET DEFAULT nextval('public.enrollment_enrollment_id_seq'::regclass);


--
-- TOC entry 4931 (class 2604 OID 16819)
-- Name: leaderboardentry entry_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leaderboardentry ALTER COLUMN entry_id SET DEFAULT nextval('public.leaderboardentry_entry_id_seq'::regclass);


--
-- TOC entry 4932 (class 2604 OID 16841)
-- Name: notification notification_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification ALTER COLUMN notification_id SET DEFAULT nextval('public.notification_notification_id_seq'::regclass);


--
-- TOC entry 4925 (class 2604 OID 16734)
-- Name: question question_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question ALTER COLUMN question_id SET DEFAULT nextval('public.question_question_id_seq'::regclass);


--
-- TOC entry 4920 (class 2604 OID 16630)
-- Name: role role_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role ALTER COLUMN role_id SET DEFAULT nextval('public.role_role_id_seq'::regclass);


--
-- TOC entry 4924 (class 2604 OID 16716)
-- Name: studyset set_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.studyset ALTER COLUMN set_id SET DEFAULT nextval('public.studyset_set_id_seq'::regclass);


--
-- TOC entry 4928 (class 2604 OID 16780)
-- Name: versionhistory version_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.versionhistory ALTER COLUMN version_id SET DEFAULT nextval('public.versionhistory_version_id_seq'::regclass);


--
-- TOC entry 5167 (class 0 OID 16639)
-- Dependencies: 222
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."User" (user_id, name, email, password_hash, role_id) FROM stdin;
\.


--
-- TOC entry 5190 (class 0 OID 16878)
-- Dependencies: 245
-- Data for Name: aisuggestion; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.aisuggestion (suggestion_id, user_id, recommended_set_id, difficulty_level) FROM stdin;
\.


--
-- TOC entry 5188 (class 0 OID 16858)
-- Dependencies: 243
-- Data for Name: analyticsevent; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.analyticsevent (event_id, user_id, event_type, "timestamp", metadata) FROM stdin;
\.


--
-- TOC entry 5178 (class 0 OID 16752)
-- Dependencies: 233
-- Data for Name: attempt; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.attempt (attempt_id, user_id, set_id, score, "timestamp") FROM stdin;
\.


--
-- TOC entry 5182 (class 0 OID 16802)
-- Dependencies: 237
-- Data for Name: badge; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.badge (badge_id, name, criteria) FROM stdin;
\.


--
-- TOC entry 5170 (class 0 OID 16674)
-- Dependencies: 225
-- Data for Name: class; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.class (class_id, class_name, teacher_id) FROM stdin;
\.


--
-- TOC entry 5172 (class 0 OID 16691)
-- Dependencies: 227
-- Data for Name: enrollment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.enrollment (enrollment_id, user_id, class_id) FROM stdin;
\.


--
-- TOC entry 5184 (class 0 OID 16816)
-- Dependencies: 239
-- Data for Name: leaderboardentry; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.leaderboardentry (entry_id, user_id, score, class_id) FROM stdin;
\.


--
-- TOC entry 5186 (class 0 OID 16838)
-- Dependencies: 241
-- Data for Name: notification; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notification (notification_id, user_id, message, sent_at) FROM stdin;
\.


--
-- TOC entry 5176 (class 0 OID 16731)
-- Dependencies: 231
-- Data for Name: question; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.question (question_id, set_id, type, content, correct_answer) FROM stdin;
\.


--
-- TOC entry 5165 (class 0 OID 16627)
-- Dependencies: 220
-- Data for Name: role; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.role (role_id, role_name) FROM stdin;
\.


--
-- TOC entry 5174 (class 0 OID 16713)
-- Dependencies: 229
-- Data for Name: studyset; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.studyset (set_id, title, subject, creator_id) FROM stdin;
\.


--
-- TOC entry 5168 (class 0 OID 16662)
-- Dependencies: 223
-- Data for Name: teacher; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.teacher (teacher_id) FROM stdin;
\.


--
-- TOC entry 5180 (class 0 OID 16777)
-- Dependencies: 235
-- Data for Name: versionhistory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.versionhistory (version_id, set_id, editor_id, "timestamp", diff) FROM stdin;
\.


--
-- TOC entry 5209 (class 0 OID 0)
-- Dependencies: 221
-- Name: User_user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."User_user_id_seq"', 1, false);


--
-- TOC entry 5210 (class 0 OID 0)
-- Dependencies: 244
-- Name: aisuggestion_suggestion_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.aisuggestion_suggestion_id_seq', 1, false);


--
-- TOC entry 5211 (class 0 OID 0)
-- Dependencies: 242
-- Name: analyticsevent_event_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.analyticsevent_event_id_seq', 1, false);


--
-- TOC entry 5212 (class 0 OID 0)
-- Dependencies: 232
-- Name: attempt_attempt_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.attempt_attempt_id_seq', 1, false);


--
-- TOC entry 5213 (class 0 OID 0)
-- Dependencies: 236
-- Name: badge_badge_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.badge_badge_id_seq', 1, false);


--
-- TOC entry 5214 (class 0 OID 0)
-- Dependencies: 224
-- Name: class_class_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.class_class_id_seq', 1, false);


--
-- TOC entry 5215 (class 0 OID 0)
-- Dependencies: 226
-- Name: enrollment_enrollment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.enrollment_enrollment_id_seq', 1, false);


--
-- TOC entry 5216 (class 0 OID 0)
-- Dependencies: 238
-- Name: leaderboardentry_entry_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.leaderboardentry_entry_id_seq', 1, false);


--
-- TOC entry 5217 (class 0 OID 0)
-- Dependencies: 240
-- Name: notification_notification_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notification_notification_id_seq', 1, false);


--
-- TOC entry 5218 (class 0 OID 0)
-- Dependencies: 230
-- Name: question_question_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.question_question_id_seq', 1, false);


--
-- TOC entry 5219 (class 0 OID 0)
-- Dependencies: 219
-- Name: role_role_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.role_role_id_seq', 1, false);


--
-- TOC entry 5220 (class 0 OID 0)
-- Dependencies: 228
-- Name: studyset_set_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.studyset_set_id_seq', 1, false);


--
-- TOC entry 5221 (class 0 OID 0)
-- Dependencies: 234
-- Name: versionhistory_version_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.versionhistory_version_id_seq', 1, false);


--
-- TOC entry 4957 (class 2606 OID 16655)
-- Name: User User_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_email_key" UNIQUE (email);


--
-- TOC entry 4959 (class 2606 OID 16653)
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (user_id);


--
-- TOC entry 4996 (class 2606 OID 16886)
-- Name: aisuggestion aisuggestion_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.aisuggestion
    ADD CONSTRAINT aisuggestion_pkey PRIMARY KEY (suggestion_id);


--
-- TOC entry 4998 (class 2606 OID 16888)
-- Name: aisuggestion aisuggestion_user_id_recommended_set_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.aisuggestion
    ADD CONSTRAINT aisuggestion_user_id_recommended_set_id_key UNIQUE (user_id, recommended_set_id);


--
-- TOC entry 4993 (class 2606 OID 16870)
-- Name: analyticsevent analyticsevent_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.analyticsevent
    ADD CONSTRAINT analyticsevent_pkey PRIMARY KEY (event_id);


--
-- TOC entry 4977 (class 2606 OID 16762)
-- Name: attempt attempt_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attempt
    ADD CONSTRAINT attempt_pkey PRIMARY KEY (attempt_id);


--
-- TOC entry 4979 (class 2606 OID 16764)
-- Name: attempt attempt_user_id_set_id_timestamp_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attempt
    ADD CONSTRAINT attempt_user_id_set_id_timestamp_key UNIQUE (user_id, set_id, "timestamp");


--
-- TOC entry 4984 (class 2606 OID 16814)
-- Name: badge badge_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.badge
    ADD CONSTRAINT badge_pkey PRIMARY KEY (badge_id);


--
-- TOC entry 4964 (class 2606 OID 16683)
-- Name: class class_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class
    ADD CONSTRAINT class_pkey PRIMARY KEY (class_id);


--
-- TOC entry 4967 (class 2606 OID 16699)
-- Name: enrollment enrollment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enrollment
    ADD CONSTRAINT enrollment_pkey PRIMARY KEY (enrollment_id);


--
-- TOC entry 4969 (class 2606 OID 16701)
-- Name: enrollment enrollment_user_id_class_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enrollment
    ADD CONSTRAINT enrollment_user_id_class_id_key UNIQUE (user_id, class_id);


--
-- TOC entry 4986 (class 2606 OID 16824)
-- Name: leaderboardentry leaderboardentry_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leaderboardentry
    ADD CONSTRAINT leaderboardentry_pkey PRIMARY KEY (entry_id);


--
-- TOC entry 4988 (class 2606 OID 16826)
-- Name: leaderboardentry leaderboardentry_user_id_class_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leaderboardentry
    ADD CONSTRAINT leaderboardentry_user_id_class_id_key UNIQUE (user_id, class_id);


--
-- TOC entry 4991 (class 2606 OID 16850)
-- Name: notification notification_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification
    ADD CONSTRAINT notification_pkey PRIMARY KEY (notification_id);


--
-- TOC entry 4975 (class 2606 OID 16744)
-- Name: question question_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question
    ADD CONSTRAINT question_pkey PRIMARY KEY (question_id);


--
-- TOC entry 4953 (class 2606 OID 16635)
-- Name: role role_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role
    ADD CONSTRAINT role_pkey PRIMARY KEY (role_id);


--
-- TOC entry 4955 (class 2606 OID 16637)
-- Name: role role_role_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role
    ADD CONSTRAINT role_role_name_key UNIQUE (role_name);


--
-- TOC entry 4972 (class 2606 OID 16723)
-- Name: studyset studyset_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.studyset
    ADD CONSTRAINT studyset_pkey PRIMARY KEY (set_id);


--
-- TOC entry 4962 (class 2606 OID 16667)
-- Name: teacher teacher_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teacher
    ADD CONSTRAINT teacher_pkey PRIMARY KEY (teacher_id);


--
-- TOC entry 4982 (class 2606 OID 16790)
-- Name: versionhistory versionhistory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.versionhistory
    ADD CONSTRAINT versionhistory_pkey PRIMARY KEY (version_id);


--
-- TOC entry 4999 (class 1259 OID 16899)
-- Name: index_ai_userdifficulty; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_ai_userdifficulty ON public.aisuggestion USING btree (user_id, difficulty_level);


--
-- TOC entry 4994 (class 1259 OID 16876)
-- Name: index_analytic_usertype; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_analytic_usertype ON public.analyticsevent USING btree (user_id, event_type);


--
-- TOC entry 4980 (class 1259 OID 16775)
-- Name: index_attempt_userset; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_attempt_userset ON public.attempt USING btree (user_id, set_id);


--
-- TOC entry 4965 (class 1259 OID 16689)
-- Name: index_class_teacher; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_class_teacher ON public.class USING btree (teacher_id);


--
-- TOC entry 4989 (class 1259 OID 16856)
-- Name: index_notifi_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_notifi_user ON public.notification USING btree (user_id);


--
-- TOC entry 4973 (class 1259 OID 16750)
-- Name: index_question_set; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_question_set ON public.question USING btree (set_id);


--
-- TOC entry 4970 (class 1259 OID 16729)
-- Name: index_studyset_creator; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_studyset_creator ON public.studyset USING btree (creator_id);


--
-- TOC entry 4960 (class 1259 OID 16661)
-- Name: index_user_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX index_user_role ON public."User" USING btree (role_id);


--
-- TOC entry 5000 (class 2606 OID 16656)
-- Name: User User_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public.role(role_id) ON DELETE RESTRICT;


--
-- TOC entry 5015 (class 2606 OID 16894)
-- Name: aisuggestion aisuggestion_recommended_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.aisuggestion
    ADD CONSTRAINT aisuggestion_recommended_set_id_fkey FOREIGN KEY (recommended_set_id) REFERENCES public.studyset(set_id) ON DELETE CASCADE;


--
-- TOC entry 5016 (class 2606 OID 16889)
-- Name: aisuggestion aisuggestion_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.aisuggestion
    ADD CONSTRAINT aisuggestion_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."User"(user_id) ON DELETE CASCADE;


--
-- TOC entry 5014 (class 2606 OID 16871)
-- Name: analyticsevent analyticsevent_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.analyticsevent
    ADD CONSTRAINT analyticsevent_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."User"(user_id) ON DELETE CASCADE;


--
-- TOC entry 5007 (class 2606 OID 16770)
-- Name: attempt attempt_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attempt
    ADD CONSTRAINT attempt_set_id_fkey FOREIGN KEY (set_id) REFERENCES public.studyset(set_id) ON DELETE CASCADE;


--
-- TOC entry 5008 (class 2606 OID 16765)
-- Name: attempt attempt_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attempt
    ADD CONSTRAINT attempt_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."User"(user_id) ON DELETE CASCADE;


--
-- TOC entry 5002 (class 2606 OID 16684)
-- Name: class class_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.class
    ADD CONSTRAINT class_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teacher(teacher_id) ON DELETE CASCADE;


--
-- TOC entry 5003 (class 2606 OID 16707)
-- Name: enrollment enrollment_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enrollment
    ADD CONSTRAINT enrollment_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.class(class_id) ON DELETE CASCADE;


--
-- TOC entry 5004 (class 2606 OID 16702)
-- Name: enrollment enrollment_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.enrollment
    ADD CONSTRAINT enrollment_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."User"(user_id) ON DELETE CASCADE;


--
-- TOC entry 5011 (class 2606 OID 16832)
-- Name: leaderboardentry leaderboardentry_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leaderboardentry
    ADD CONSTRAINT leaderboardentry_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.class(class_id) ON DELETE CASCADE;


--
-- TOC entry 5012 (class 2606 OID 16827)
-- Name: leaderboardentry leaderboardentry_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.leaderboardentry
    ADD CONSTRAINT leaderboardentry_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."User"(user_id) ON DELETE CASCADE;


--
-- TOC entry 5013 (class 2606 OID 16851)
-- Name: notification notification_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification
    ADD CONSTRAINT notification_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."User"(user_id) ON DELETE CASCADE;


--
-- TOC entry 5006 (class 2606 OID 16745)
-- Name: question question_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.question
    ADD CONSTRAINT question_set_id_fkey FOREIGN KEY (set_id) REFERENCES public.studyset(set_id) ON DELETE CASCADE;


--
-- TOC entry 5005 (class 2606 OID 16724)
-- Name: studyset studyset_creator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.studyset
    ADD CONSTRAINT studyset_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public."User"(user_id) ON DELETE CASCADE;


--
-- TOC entry 5001 (class 2606 OID 16668)
-- Name: teacher teacher_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teacher
    ADD CONSTRAINT teacher_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public."User"(user_id) ON DELETE CASCADE;


--
-- TOC entry 5009 (class 2606 OID 16796)
-- Name: versionhistory versionhistory_editor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.versionhistory
    ADD CONSTRAINT versionhistory_editor_id_fkey FOREIGN KEY (editor_id) REFERENCES public."User"(user_id) ON DELETE SET NULL;


--
-- TOC entry 5010 (class 2606 OID 16791)
-- Name: versionhistory versionhistory_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.versionhistory
    ADD CONSTRAINT versionhistory_set_id_fkey FOREIGN KEY (set_id) REFERENCES public.studyset(set_id) ON DELETE CASCADE;


-- Completed on 2025-11-11 17:52:20

--
-- PostgreSQL database dump complete
--

\unrestrict 5mtRqkefuckaeEtYfN0cVneKmo8CwaaVrmutMoUDseRAzafzdcNOvrUoQjyeU3g

