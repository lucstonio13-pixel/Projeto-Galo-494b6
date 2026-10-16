import { getDatabase, type DatabaseConnection } from "@netlify/database";

type QueryResult<T = Record<string, unknown>> = {
  results: T[];
  success: true;
  meta: { changes: number };
};

type Queryable = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }>;
};

function postgresSql(source: string) {
  let index = 0;
  let quote = "";
  let output = "";
  for (let position = 0; position < source.length; position += 1) {
    const character = source[position];
    if (quote) {
      output += character;
      if (character === quote && source[position - 1] !== "\\") quote = "";
    } else if (character === "'" || character === '"') {
      quote = character;
      output += character;
    } else if (character === "?") {
      index += 1;
      output += `$${index}`;
    } else if (character === "`") {
      output += '"';
    } else {
      output += character;
    }
  }
  return output.replace(/(?<!["\w])user(?!["\w])/gi, '"user"');
}

class NetlifyPreparedStatement {
  constructor(
    private readonly connection: DatabaseConnection,
    private readonly source: string,
    private readonly values: unknown[] = [],
  ) {}

  bind(...values: unknown[]) {
    return new NetlifyPreparedStatement(this.connection, this.source, values);
  }

  private async execute(queryable: Queryable = this.connection.pool as unknown as Queryable) {
    const result = await queryable.query(postgresSql(this.source), this.values);
    return {
      results: result.rows,
      success: true as const,
      meta: { changes: result.rowCount ?? 0 },
    };
  }

  async first<T = Record<string, unknown>>() {
    const result = await this.execute();
    return (result.results[0] as T | undefined) ?? null;
  }

  async all<T = Record<string, unknown>>() {
    return await this.execute() as QueryResult<T>;
  }

  async run<T = Record<string, unknown>>() {
    return await this.execute() as QueryResult<T>;
  }

  async raw<T = unknown[]>() {
    const result = await this.execute();
    return result.results.map((row) => Object.values(row)) as T[];
  }

  async executeWith(queryable: Queryable) {
    return this.execute(queryable);
  }
}

class NetlifyD1Database {
  constructor(private readonly connection: DatabaseConnection) {}

  prepare(source: string) {
    return new NetlifyPreparedStatement(this.connection, source);
  }

  async batch(statements: NetlifyPreparedStatement[]) {
    const client = await this.connection.pool.connect();
    try {
      await client.query("BEGIN");
      const results = [];
      for (const statement of statements) results.push(await statement.executeWith(client as unknown as Queryable));
      await client.query("COMMIT");
      return results;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

let instance: NetlifyD1Database | undefined;

export function getNetlifyD1() {
  instance ??= new NetlifyD1Database(getDatabase());
  return instance as unknown as D1Database;
}
