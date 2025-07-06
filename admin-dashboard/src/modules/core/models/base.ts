export type UUID = string;

export interface Entity {
    id: UUID;
    created_at: string;
    updated_at: string;
}

export enum Status {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    PENDING = 'pending',
    SUSPENDED = 'suspended'
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
}

export type Result<T, E = Error> = {
    success: true;
    data: T;
} | {
    success: false;
    error: E;
};