import { getModule } from './module';

export const getLibraryVersion = (): string => getModule().UTF8ToString(getModule().get_lib_version());
