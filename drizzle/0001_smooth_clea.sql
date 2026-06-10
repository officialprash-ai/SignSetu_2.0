CREATE TABLE `fingerspellingAlphabet` (
	`id` int AUTO_INCREMENT NOT NULL,
	`letter` varchar(1) NOT NULL,
	`language` enum('ASL','ISL') NOT NULL,
	`poseUrl` varchar(512) NOT NULL,
	`duration` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `fingerspellingAlphabet_id` PRIMARY KEY(`id`),
	CONSTRAINT `fingerspellingAlphabet_letter_unique` UNIQUE(`letter`)
);
--> statement-breakpoint
CREATE TABLE `sessionHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`translationId` int NOT NULL,
	`inputText` text NOT NULL,
	`glossSequence` text NOT NULL,
	`language` enum('ASL','ISL') NOT NULL,
	`sourceType` enum('text','audio','youtube') NOT NULL DEFAULT 'text',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sessionHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `signDictionary` (
	`id` int AUTO_INCREMENT NOT NULL,
	`gloss` varchar(128) NOT NULL,
	`language` enum('ASL','ISL') NOT NULL,
	`poseUrl` varchar(512) NOT NULL,
	`videoUrl` varchar(512),
	`duration` int,
	`category` varchar(64),
	`priority` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `signDictionary_id` PRIMARY KEY(`id`),
	CONSTRAINT `signDictionary_gloss_unique` UNIQUE(`gloss`)
);
--> statement-breakpoint
CREATE TABLE `translations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`inputText` text NOT NULL,
	`glossSequence` text NOT NULL,
	`language` enum('ASL','ISL') NOT NULL DEFAULT 'ASL',
	`sourceType` enum('text','audio','youtube') NOT NULL DEFAULT 'text',
	`avatarAnimationUrl` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `translations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userPreferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`preferredLanguage` enum('ASL','ISL') NOT NULL DEFAULT 'ASL',
	`avatarChoice` varchar(64) DEFAULT 'default',
	`playbackSpeed` int DEFAULT 100,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userPreferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `userPreferences_userId_unique` UNIQUE(`userId`)
);
