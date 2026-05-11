export interface JdkInfo {
  version: string;
  path: string;
  source: string;
}

export interface JavaConfig {
  jdks: JdkInfo[];
  selected_path: string | null;
}

export interface GameVersion {
  version: string;
  published_at: string;
  download_url: string;
  server_download_url?: string;
  has_server: boolean;
  body: string;
  prerelease: boolean;
}

export interface BeVersion {
  version: string;
  published_at: string;
  download_url: string;
}

export interface InstalledVersion {
  version: string;
  has_game: boolean;
  has_server: boolean;
}

export interface PlayRecord {
  version: string;
  timestamp: string;
}

export interface ModInfo {
  name: string;
  display_name: string;
  author: string;
  description: string;
  repo: string;
  stars: number;
  last_updated: string;
}

export interface ModVersion {
  tag_name: string;
  published_at: string;
  assets: ModAsset[];
}

export interface ModAsset {
  name: string;
  browser_download_url: string;
  content_type: string;
  size: number;
}

export type DownloadTask = {
  id: string;
  url: string;
  fileName: string;
  version: string;
  progress: number;
  speed: string;
  status: "downloading" | "completed" | "error";
  errorMsg?: string;
};

export type Toast = {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
};