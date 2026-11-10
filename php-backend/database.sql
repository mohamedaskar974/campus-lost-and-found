-- ============================================================================
-- CRESCENT RECLAIM - CAMPUS LOST & FOUND PORTAL
-- MySQL Relational Database Schema
-- Submitted by: M. MOHAED ASKAR (Reg No: 240071601159)
-- B.S. Abdur Rahman Crescent Institute of Science & Technology
-- ============================================================================

CREATE DATABASE IF NOT EXISTS crescent_lost_found CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE crescent_lost_found;

-- 1. Table for Reported Lost & Found Items
CREATE TABLE IF NOT EXISTS items (
    id VARCHAR(50) PRIMARY KEY,
    type ENUM('lost', 'found') NOT NULL,
    status ENUM('active', 'claim_pending', 'reunited') NOT NULL DEFAULT 'active',
    category VARCHAR(60) NOT NULL,
    title VARCHAR(150) NOT NULL,
    `desc` TEXT NOT NULL,
    zone VARCHAR(100) NOT NULL,
    exact_spot VARCHAR(150) NOT NULL,
    photo_url VARCHAR(255) NOT NULL,
    reporter_name VARCHAR(100) NOT NULL,
    reporter_email VARCHAR(120) NOT NULL,
    reporter_phone VARCHAR(30) DEFAULT NULL,
    reporter_reg VARCHAR(50) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Table for Submitted Claims
CREATE TABLE IF NOT EXISTS claims (
    id VARCHAR(50) PRIMARY KEY,
    item_id VARCHAR(50) NOT NULL,
    claimant_name VARCHAR(100) NOT NULL,
    claimant_reg VARCHAR(50) NOT NULL,
    claimant_email VARCHAR(120) NOT NULL,
    claimant_phone VARCHAR(30) NOT NULL,
    proof_details TEXT NOT NULL,
    status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Table for Automated Email Dispatch Logs
CREATE TABLE IF NOT EXISTS email_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipient_email VARCHAR(120) NOT NULL,
    recipient_name VARCHAR(100) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    item_title VARCHAR(150) NOT NULL,
    body_html TEXT NOT NULL,
    claimant_name VARCHAR(100) NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Sample Campus Data Seeding
INSERT INTO items (id, type, status, category, title, `desc`, zone, exact_spot, photo_url, reporter_name, reporter_email, reporter_phone, reporter_reg) VALUES
('item-101', 'found', 'active', 'Electronics', 'Casio fx-991EX Classwiz Calculator', 'Found on study table in silent reading zone. Has blue anime sticker on the back cover.', 'Central Library', '2nd Floor Silent Hall, Table 14', 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?q=80&w=600&auto=format&fit=crop', 'Dr. K. Palanivel / Librarian Desk', 'library.desk@crescent.education', '+91 98401 22334', 'FAC-LIB-04'),
('item-102', 'found', 'active', 'Cards', 'Crescent Student ID Card (II B.Sc CS)', 'Blue lanyard with Crescent crest. Kept safely at the Canteen billing counter.', 'Main Canteen', 'Juice Counter Corner Table', 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?q=80&w=600&auto=format&fit=crop', 'Canteen Supervisor', 'canteen@crescent.education', '+91 98402 99881', 'STAFF-CAN-02'),
('item-103', 'lost', 'active', 'Keys', 'Yamaha Bike Keys with Crescent Lanyard', 'Set of 2 keys with a black rubber key-head and a Crescent Club lanyard.', 'Campus Parking', 'Two-Wheeler Gate 2 Shed', 'https://images.unsplash.com/photo-1582139329536-e7284fece509?q=80&w=600&auto=format&fit=crop', 'M. Mohaed Askar', 'askar@crescent.education', '+91 98401 23456', '240071601159'),
('item-104', 'found', 'active', 'Bottles', 'Milton Thermosteel Black Water Bottle (750ml)', 'Matte black insulated bottle with a small dent at bottom rim.', 'Sports Complex', 'Badminton Court 1 Bench', 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?q=80&w=600&auto=format&fit=crop', 'Sports In-Charge', 'sports@crescent.education', '+91 98403 44556', 'STAFF-SPT-01');
