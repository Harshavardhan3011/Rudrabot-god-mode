// 🔱 RUDRA.0x Logger Utility
// Centralized logging with colors and formatting

import chalk from "chalk";

class Logger {
  /**
   * Success log (green)
   */
  static success(message: string, prefix = "✅"): void {
    console.log(chalk.green(`${prefix} ${message}`));
  }

  /**
   * Error log (red)
   */
  static error(message: string, error?: any): void {
    console.error(chalk.red(`❌ ${message}`));
    if (error) {
      console.error(chalk.red(error));
    }
  }

  /**
   * Warning log (yellow)
   */
  static warn(message: string): void {
    console.warn(chalk.yellow(`⚠️  ${message}`));
  }

  /**
   * Info log (cyan)
   */
  static info(message: string): void {
    console.log(chalk.cyan(`ℹ️  ${message}`));
  }

  /**
   * Debug log (gray)
   */
  static debug(message: string): void {
    if (process.env.NODE_ENV === "development") {
      console.log(chalk.gray(`🔍 ${message}`));
    }
  }

  /**
   * Command execution log (blue)
   */
  static command(command: string, user: string): void {
    console.log(chalk.blue(`🔘 Command: ${command} | User: ${user}`));
  }

  /**
   * Module load log (cyan)
   */
  static module(moduleName: string, count: number): void {
    console.log(chalk.cyan(`📦 Loaded ${moduleName}: ${count} items`));
  }

  /**
   * Server log (magenta)
   */
  static server(message: string): void {
    console.log(chalk.magenta(`🌐 ${message}`));
  }

  /**
   * Security event log (red with bold)
   */
  static security(message: string): void {
    console.log(chalk.bold.red(`🛡️  SECURITY: ${message}`));
  }

  /**
   * Table log helper
   */
  static table(data: any): void {
    console.table(data);
  }

  /**
   * Separator line
   */
  static separator(): void {
    console.log(chalk.gray("═".repeat(60)));
  }

  /**
   * Startup banner
   */
  static banner(): void {
    console.clear();
    console.log(chalk.cyan.bold("╔════════════════════════════════════════════════════════╗"));
    console.log(chalk.cyan.bold("║                    🔱 RUDRA.0x ONLINE 🔱              ║"));
    console.log(chalk.cyan.bold("║         Beyond Limitations. Beyond Boundaries.        ║"));
    console.log(chalk.cyan.bold("╚════════════════════════════════════════════════════════╝"));
    console.log();
  }
}

export default Logger;
