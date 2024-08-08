declare module "bun" {
	interface Env {
		JWT_SECRET: string;
		MONGO_URI: string;
	}
}
