import * as Resources from '@gitbeaker/core';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import neo4j from 'neo4j-driver';
import { Driver } from 'neo4j-driver';
import { Date as Neo4jDate } from 'neo4j-driver-core/lib/temporal-types.js';
import { LoggerService } from '../logger/logger.service';
import { GitlabProjectEntity } from '../gitlab/entities/gitlab-project.entity';
import { NodeProjectAnalysisJobReturnValue } from 'src/models/jobs/NodeProjectAnalysisJobData';
import { GitAuthorData } from 'src/models/GitAuthorData';
import { LocStats } from 'src/models/LocStats';
import { AngularComponent } from 'src/models/AngularComponent';

@Injectable()
export class GraphService {
  private driver: Driver;

  constructor(
    readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) {
    logger.setContext(GraphService.name);
    const uri = config.get('NEO4J_URI') || 'neo4j://localhost:7687';
    const user = config.get('NEO4J_USER') || 'neo4j';
    const password = config.get('NEO4J_PASSWORD') || 'neo4j';

    this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
      maxConnectionPoolSize: 400,
      maxTransactionRetryTime: 30000,
    });
    this.driver.getServerInfo().then((server) => {
      logger.log(`Connected to Neo4j server ${server.address}`);
    });
  }

  async getGitRepositoryNode(id: number) {
    const query = `MATCH (g:GitRepository {id: $id}) RETURN g`;
    const session = this.driver.session();

    let result;
    try {
      result = await session.run(query, { id });
    } finally {
      await session.close();
    }

    return result?.records?.length ? result.records[0] : null;
  }

  async createGitlabRepositoryNode(gitlabProject: GitlabProjectEntity) {
    this.logger.verbose(
      `Merging GitRepository node for project ${gitlabProject.id}`,
    );

    const project: Resources.ProjectSchema = gitlabProject.project;

    const type = 'GitLab';
    // TODO add size?
    const query = `
      MERGE (g:GitRepository {id: $id}) 
      SET g.name = $name, 
        g.type = $type, 
        g.path = $path, 
        g.web_url = $web_url, 
        g.ssh_url_to_repo = $ssh_url_to_repo, 
        g.http_url_to_repo = $http_url_to_repo, 
        g.default_branch = $default_branch, 
        g.created_at = $created_at, 
        g.last_activity_at = $last_activity_at, 
        g.visibility = $visibility, 
        g.open_issues_count = $open_issues_count, 
        g.forks_count = $forks_count, 
        g.star_count = $star_count, 
        g.namespace = $namespace, 
        g.namespace_kind = $namespace_kind, 
        g.is_fork = $is_fork
    `;

    const session = this.driver.session();
    try {
      await session.run(query, {
        id: project.id,
        name: project.name,
        type,
        path: project.path || '',
        web_url: project.web_url || '',
        ssh_url_to_repo: project.ssh_url_to_repo || '',
        http_url_to_repo: project.http_url_to_repo || '',
        default_branch: project.default_branch || '',
        created_at:
          Neo4jDate.fromStandardDate(new Date(project.created_at)) || null,
        last_activity_at:
          Neo4jDate.fromStandardDate(new Date(project.last_activity_at)) ||
          null,
        visibility: project.visibility || '',
        open_issues_count: project.open_issues_count || 0,
        forks_count: project.forks_count || 0,
        star_count: project.star_count || 0,
        namespace: project.namespace?.full_path || '',
        namespace_kind: project.namespace?.kind || '',
        is_fork: !!project.forked_from_project || false,
      });
    } finally {
      await session.close();
    }
  }

  async createNodeProjectNode(nodeProject: NodeProjectAnalysisJobReturnValue) {
    this.logger.verbose(
      `Merging NodeProject node for project ${nodeProject.id}`,
    );

    const nodeProjectId = nodeProject.nodeProjectId;

    const query = `MERGE (n:NodeProject {id: $id})
      SET n.name = $name, 
        n.packageJson = $packageJson, 
        n.hasNodeModules = $hasNodeModules, 
        n.packageJson = $packageJson, 
        n.directorySize = $directorySize,
        n.projectTypes = $projectTypes,
        n.srcFolder = $srcFolder,

        n.files = $files,
        n.methods = $methods,
        n.linesOfCode = $linesOfCode,
        n.cognitiveComplexity = $cognitiveComplexity,
        n.cyclomaticComplexity = $cyclomaticComplexity
    `;

    const session = this.driver.session();

    try {
      await session.executeWrite(async (tx) => {
        // create the project node
        await tx.run(query, {
          id: nodeProjectId,
          name: nodeProject.name,
          packageJson: JSON.stringify(nodeProject.packageJson || {}),
          hasNodeModules: nodeProject.hasNodeModules,
          directorySize: nodeProject.directorySize,
          projectTypes: nodeProject.projectTypes,
          srcFolder: nodeProject.srcFolder,

          // genese stats
          files: nodeProject.complexity?.files || null,
          methods: nodeProject.complexity?.methods || null,
          linesOfCode: nodeProject.complexity?.linesOfCode || null,
          cognitiveComplexity:
            nodeProject.complexity?.cognitiveComplexity || null,
          cyclomaticComplexity:
            nodeProject.complexity?.cyclomaticComplexity || null,

          // TODO add LocStats immediately?
        });

        // link the project with the repository
        await tx.run(
          'MATCH (g:GitRepository), (p:NodeProject) WHERE g.id = $repoId AND p.id = $projectId MERGE (g)-[r:CONTAINS]->(p)',
          {
            repoId: nodeProject.id,
            projectId: nodeProjectId,
          },
        );

        const packageName = nodeProject.packageJson?.name;

        if (packageName) {
          // create a dependency for each node project
          await tx.run('MERGE (d:Dependency {name: $name}) RETURN d', {
            name: packageName,
          });
          // link the dependency with the project
          // so that the relationship of other projects depending on this one can be found
          await tx.run(
            'MATCH (p:NodeProject), (d:Dependency) WHERE p.id = $id AND d.name = $depName MERGE (p)-[r:PUBLISHES]->(d)',
            {
              id: nodeProjectId,
              depName: packageName,
            },
          );
        }
      });
    } finally {
      await session.close();
    }

    return nodeProjectId;
  }

  async updateNodeProjectStats(nodeProjectId: string, locStats: LocStats) {
    this.logger.verbose(`Updating LoC stats for NodeProject ${nodeProjectId}`);

    const query = `MATCH (g:NodeProject) WHERE g.id = $id 
    SET 
      g.tsFiles = $tsFiles,
      g.tsLines = $tsLines,
      g.tsComments = $tsComments,
      g.jsFiles = $jsFiles,
      g.jsLines = $jsLines,
      g.jsComments = $jsComments,
      g.cssFiles = $cssFiles,
      g.cssLines = $cssLines,
      g.cssComments = $cssComments,
      g.scssFiles = $scssFiles,
      g.scssLines = $scssLines,
      g.scssComments = $scssComments,
      g.htmlFiles = $htmlFiles,
      g.htmlLines = $htmlLines,
      g.htmlComments = $htmlComments,
      g.pumlFiles = $pumlFiles,
      g.pumlLines = $pumlLines,
      g.pumlComments = $pumlComments,
      g.mdFiles = $mdFiles,
      g.mdLines = $mdLines,
      g.mdComments = $mdComments
    `;

    const session = this.driver.session();

    try {
      await session.run(query, {
        id: nodeProjectId,
        tsFiles: locStats.tsFiles || 0,
        tsLines: locStats.tsLines || 0,
        tsComments: locStats.tsComments || 0,
        jsFiles: locStats.jsFiles || 0,
        jsLines: locStats.jsLines || 0,
        jsComments: locStats.jsComments || 0,
        cssFiles: locStats.cssFiles || 0,
        cssLines: locStats.cssLines || 0,
        cssComments: locStats.cssComments || 0,
        scssFiles: locStats.scssFiles || 0,
        scssLines: locStats.scssLines || 0,
        scssComments: locStats.scssComments || 0,
        htmlFiles: locStats.htmlFiles || 0,
        htmlLines: locStats.htmlLines || 0,
        htmlComments: locStats.htmlComments || 0,
        pumlFiles: locStats.pumlFiles || 0,
        pumlLines: locStats.pumlLines || 0,
        pumlComments: locStats.pumlComments || 0,
        mdFiles: locStats.mdFiles || 0,
        mdLines: locStats.mdLines || 0,
        mdComments: locStats.mdComments || 0,
      });
    } finally {
      await session.close();
    }
  }

  async createAuthorNode(author: GitAuthorData) {
    this.logger.verbose(`Creating Author node for author ${author.name}`);

    const query = `MERGE (a:Author {email: $email})
      SET a.name = $name
    `;

    const session = this.driver.session();
    try {
      await session.run(query, {
        email: author.email,
        name: author.name,
      });
    } finally {
      await session.close();
    }
  }

  async createAuthorData(repoId: number, author: GitAuthorData) {
    this.logger.verbose(
      `Merging Author data for author ${author.name} and repo ${repoId}`,
    );

    await this.createAuthorNode(author);

    // link the author with the git repo
    const query = `MATCH (g:GitRepository {id: $id}), (a:Author {email: $email}) 
      MERGE (a)-[r:CONTRIBUTES_TO]->(g) 
      SET r.commits = $commits,
        r.lines = $lines,
        r.linesChanged = $linesChanged,
        r.lineInsertions = $lineInsertions,
        r.lineDeletions = $lineDeletions, 
        r.lastActivity = $lastActivity
    `;

    const session = this.driver.session();
    try {
      await session.run(query, {
        email: author.email, // from
        id: repoId, // to

        commits: author.commits,
        lines: author.lines,
        linesChanged: author.linesChanged,
        lineInsertions: author.lineInsertions,
        lineDeletions: author.lineDeletions,
        lastActivity:
          Neo4jDate.fromStandardDate(new Date(author.lastActivity)) || null,
      });
    } finally {
      await session.close();
    }
  }

  async createDependencies(
    nodeProjectId: string,
    type: 'Dependency' | 'DevDependency' | 'PeerDependency',
    dependencies: Record<string, string>,
  ) {
    this.logger.verbose(
      `Creating ${type} data for node project ${nodeProjectId}`,
    );

    const createDepQuery = `MERGE (d:Dependency {name: $name}) RETURN d`;
    const dependsOnQuery = `MATCH (p:NodeProject), (d:Dependency) 
      WHERE p.id = $id AND d.name = $depName 
      MERGE (p)-[r:DEPENDS_ON]->(d) 
      SET r.version = $version, r.type = $type`;

    const session = this.driver.session();
    try {
      await session.executeWrite(async (tx) => {
        await Object.keys(dependencies).reduce(async (promise, dependency) => {
          await promise;
          await tx.run(createDepQuery, {
            name: dependency,
          });
          await tx.run(dependsOnQuery, {
            id: nodeProjectId,
            depName: dependency,
            version: dependencies[dependency],
            type,
          });
        }, Promise.resolve());
      });
    } finally {
      await session.close();
    }
  }

  async createAngularComponents(
    nodeProjectId: string,
    angularComponents: AngularComponent[],
  ) {
    this.logger.verbose(
      `Merging ${angularComponents.length} Angular components for node project ${nodeProjectId}`,
    );

    const mergeNodes = angularComponents
      .map(
        (c, i) => `MERGE (c${i}:Component {name: $name${i}, type: $type${i}})`,
      )
      .join(' ');
    const variables = angularComponents.reduce((vars, comp, i) => {
      return {
        ...vars,
        [`name${i}`]: comp.name,
        [`type${i}`]: comp.type,
      };
    }, {});

    const session = this.driver.session();
    try {
      await session.executeWrite(async (tx) => {
        await tx.run(`${mergeNodes}`, variables);
        const nodes = angularComponents
          .map((c, i) => `(c${i}:Component {name: $name${i}, type: $type${i}})`)
          .join(', ');
        const relationships = angularComponents
          .map((_c, i) => `MERGE (p)-[:HAS_COMPONENT]->(c${i})`)
          .join(' ');
        console.log(
          `Creating ${angularComponents.length} Component node relationships`,
        );
        await tx.run(
          `MATCH (p:NodeProject), ${nodes} WHERE p.id = $id ${relationships}`,
          {
            id: nodeProjectId,
            ...variables,
          },
        );
      });
    } finally {
      await session.close();
    }
  }
}
