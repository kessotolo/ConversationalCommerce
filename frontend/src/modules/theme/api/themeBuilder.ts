import type { UUID } from '@/modules/core/models/base';
import type {
    ThemeBuilderCreateRequest,
    ThemeBuilderUpdateRequest,
    ThemeBuilderResponse,
    ThemeVersionCreate,
    ThemeVersionUpdate,
    ThemeVersionResponse,
    WhatsAppThemeCommand,
    WhatsAppThemeResponse,
} from '@/modules/theme/models/theme-builder';

import { apiClient } from '@/lib/api';

const THEME_BUILDER_BASE_URL = '/api/v1/theme-builder';

export const themeBuilderApi = {
    // Theme CRUD operations
    async createTheme(request: ThemeBuilderCreateRequest): Promise<ThemeBuilderResponse> {
        const response = await apiClient.post<ThemeBuilderResponse>(
            `${THEME_BUILDER_BASE_URL}/`,
            request
        );
        return response.data;
    },

    async getTheme(themeId: UUID): Promise<ThemeBuilderResponse> {
        const response = await apiClient.get<ThemeBuilderResponse>(
            `${THEME_BUILDER_BASE_URL}/${themeId}`
        );
        return response.data;
    },

    async updateTheme(
        themeId: UUID,
        request: ThemeBuilderUpdateRequest
    ): Promise<ThemeBuilderResponse> {
        const response = await apiClient.put<ThemeBuilderResponse>(
            `${THEME_BUILDER_BASE_URL}/${themeId}`,
            request
        );
        return response.data;
    },

    async deleteTheme(themeId: UUID): Promise<void> {
        await apiClient.delete(`${THEME_BUILDER_BASE_URL}/${themeId}`);
    },

    // Version operations
    async createVersion(
        themeId: UUID,
        request: ThemeVersionCreate
    ): Promise<ThemeVersionResponse> {
        const response = await apiClient.post<ThemeVersionResponse>(
            `${THEME_BUILDER_BASE_URL}/${themeId}/versions`,
            request
        );
        return response.data;
    },

    async getVersion(versionId: UUID): Promise<ThemeVersionResponse> {
        const response = await apiClient.get<ThemeVersionResponse>(
            `${THEME_BUILDER_BASE_URL}/versions/${versionId}`
        );
        return response.data;
    },

    async updateVersion(
        versionId: UUID,
        request: ThemeVersionUpdate
    ): Promise<ThemeVersionResponse> {
        const response = await apiClient.put<ThemeVersionResponse>(
            `${THEME_BUILDER_BASE_URL}/versions/${versionId}`,
            request
        );
        return response.data;
    },

    async publishVersion(versionId: UUID): Promise<ThemeVersionResponse> {
        const response = await apiClient.post<ThemeVersionResponse>(
            `${THEME_BUILDER_BASE_URL}/versions/${versionId}/publish`
        );
        return response.data;
    },

    // WhatsApp integration
    async handleWhatsAppCommand(command: WhatsAppThemeCommand): Promise<WhatsAppThemeResponse> {
        const response = await apiClient.post<WhatsAppThemeResponse>(
            `${THEME_BUILDER_BASE_URL}/whatsapp/command`,
            command
        );
        return response.data;
    },
};