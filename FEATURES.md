# Catalyst Discord Bot: Current Features

This document outlines the current implemented features of the Catalyst Discord bot - the dynamic social engine for Discord communities.

## Core Systems

### 🎯 Event Capture Engine
- **Message Tracking:** Monitors messages for patterns, keywords, and emotional content
- **Reaction Tracking:** Tracks emoji reactions to identify engagement levels
- **Voice Activity:** Tracks voice channel activity for drama detection
- **User Mention Analysis:** Analyzes mentions to identify potential conflicts

### 🔍 Drama Analytics Core
- **Drama Intensity Score (DIS):** Calculates drama scores based on message content, mentions, capitalization, and punctuation
- **User Tracking:** Maintains stats of user participation in drama events
- **Signal Processing:** Identifies keywords, patterns, and emotional triggers in messages
- **Thresholds:** Configurable thresholds for drama event triggering

### 🏛️ Faction System
- **Faction Creation:** Users can create new factions
- **Faction Joining/Leaving:** Users can join or leave factions
- **Power Dynamics:** Factions gain and lose power based on member activities
- **Alliances/Rivalries:** Factions can form alliances or declare rivalries

### ⚡ Action Dispatcher
- **Dynamic Channels:** Creates and manages channels based on activity
- **Role Assignment:** Assigns roles based on faction membership
- **Event Announcements:** Broadcasts significant drama events to relevant channels
- **Duel System:** Supports user vs. user challenge system with voting

## User Interface

### 💬 Command System
- **!help:** View all available commands
- **!status:** Check bot status and connection information
- **Faction Commands:** Create, join, and manage factions

### 📊 Feedback Systems
- **Drama Timeline:** Records significant drama events with timestamps
- **Voting System:** Users can vote on duels and other events
- **Automated Announcements:** Bot announces significant events

## Technical Features

### 🛠️ Framework
- **TypeScript:** Fully implemented in TypeScript for type safety
- **Discord.js v14:** Utilizes latest Discord API features
- **Modular Design:** Core systems are separated into independent modules

### 💾 Data Storage
- **Database Integration:** Supabase/PostgreSQL integration for persistent storage
- **Fallback Storage:** Local file-based storage for development or when database is unavailable
- **Data Models:** Comprehensive models for users, factions, and events

### 🧩 Plugin Architecture
- **Modular Design:** Core systems can be enabled/disabled independently
- **Configuration Options:** Server-specific configuration options

## Admin Features

### ⚙️ Configuration
- **Server Setup:** Initial setup of required channels and roles
- **Threshold Configuration:** Customizable thresholds for drama detection
- **Command Prefix:** Configurable command prefix

---

> Note: This document represents the current state of Catalyst's implementation. Many planned features are in active development.
