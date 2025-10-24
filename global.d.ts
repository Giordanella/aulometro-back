/// <reference types="jest" />

// Ampliación mínima de tipos para evitar errores de IntelliSense/TS en JS
// Permitimos acceder a propiedades como `id` o `estado` en instancias de Sequelize Model
declare module "sequelize" {
	interface Model<TModelAttributes = any, TCreationAttributes = any> {
		// Acceso laxo a cualquier propiedad persistida (útil en JS puro)
		[key: string]: any;
		get(options?: any): any;
		toJSON(): any;
	}
}
