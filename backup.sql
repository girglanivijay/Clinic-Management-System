--
-- PostgreSQL database dump
--

\restrict oVgIj9Mf8mwSRkJt8R5jON8Dhh1kJRV86XQW3tnohayMAri9n263fUmJB7KSePm

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
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
-- Name: complaint_codes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.complaint_codes (
    id integer NOT NULL,
    code text NOT NULL,
    complaint text NOT NULL,
    treatment text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.complaint_codes OWNER TO postgres;

--
-- Name: complaint_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.complaint_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.complaint_codes_id_seq OWNER TO postgres;

--
-- Name: complaint_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.complaint_codes_id_seq OWNED BY public.complaint_codes.id;


--
-- Name: patients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.patients (
    id integer NOT NULL,
    name text NOT NULL,
    age integer NOT NULL,
    address text NOT NULL,
    mobile text NOT NULL,
    complaint_code text,
    complaint text,
    treatment text,
    advice text,
    reports text,
    fees numeric(10,2) DEFAULT '0'::numeric NOT NULL,
    visit_date date NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.patients OWNER TO postgres;

--
-- Name: patients_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.patients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.patients_id_seq OWNER TO postgres;

--
-- Name: patients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.patients_id_seq OWNED BY public.patients.id;


--
-- Name: complaint_codes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.complaint_codes ALTER COLUMN id SET DEFAULT nextval('public.complaint_codes_id_seq'::regclass);


--
-- Name: patients id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patients ALTER COLUMN id SET DEFAULT nextval('public.patients_id_seq'::regclass);


--
-- Data for Name: complaint_codes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.complaint_codes (id, code, complaint, treatment, created_at) FROM stdin;
\.


--
-- Data for Name: patients; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.patients (id, name, age, address, mobile, complaint_code, complaint, treatment, advice, reports, fees, visit_date, created_at) FROM stdin;
\.


--
-- Name: complaint_codes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.complaint_codes_id_seq', 1, false);


--
-- Name: patients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.patients_id_seq', 1, false);


--
-- Name: complaint_codes complaint_codes_code_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.complaint_codes
    ADD CONSTRAINT complaint_codes_code_unique UNIQUE (code);


--
-- Name: complaint_codes complaint_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.complaint_codes
    ADD CONSTRAINT complaint_codes_pkey PRIMARY KEY (id);


--
-- Name: patients patients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.patients
    ADD CONSTRAINT patients_pkey PRIMARY KEY (id);


--
-- PostgreSQL database dump complete
--

\unrestrict oVgIj9Mf8mwSRkJt8R5jON8Dhh1kJRV86XQW3tnohayMAri9n263fUmJB7KSePm

