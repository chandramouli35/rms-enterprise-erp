import { SettingsService } from './settings.service';
export declare class SettingsController {
    private readonly settingsService;
    constructor(settingsService: SettingsService);
    getGlobalSetting(key: string): Promise<{
        key: string;
        value: string | null;
    }>;
    updateGlobalSetting(data: {
        key: string;
        value: string;
    }): Promise<{
        id: string;
        updatedAt: Date;
        value: string;
        key: string;
    }>;
}
