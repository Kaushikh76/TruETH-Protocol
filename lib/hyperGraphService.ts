// lib/hyperGraphService.ts - Corrected version
import axios from 'axios';
import { ExtractedEntities } from './aiEntityExtractor';

export interface KnowledgeGraphNode {
  id: string;
  blobId: string;
  investigationId: string;
  author: string;
  createdAt: string;
  entities: {
    day?: string;
    date?: string;
    time?: string;
    location?: string;
    walletAddresses: string[];
    suspectAddresses: string[];
    eventType: string;
    amount?: string;
    currency?: string;
    platform?: string;
    urls?: string[];
  };
  tags: string[];
}

export class HyperGraphService {
  private hypergraphEndpoint: string;

  constructor() {
    // HyperGraph testnet endpoint - no API key needed
    this.hypergraphEndpoint = process.env.HYPERGRAPH_ENDPOINT || 'https://api.thegraph.com/subgraphs/name/hypergraph-protocol/hypergraph-testnet';
  }

  async storeKnowledgeNode(
    blobId: string,
    investigationId: string,
    author: string,
    entities: ExtractedEntities,
    tags: string[]
  ): Promise<{ success: boolean; nodeId?: string; error?: string }> {
    try {
      const node: KnowledgeGraphNode = {
        id: `investigation_${investigationId}`,
        blobId,
        investigationId,
        author,
        createdAt: new Date().toISOString(),
        entities: {
          day: entities.day,
          date: entities.date,
          time: entities.time,
          location: entities.location,
          walletAddresses: entities.walletAddresses,
          suspectAddresses: entities.suspectAddresses,
          eventType: entities.eventType,
          amount: entities.amount,
          currency: entities.currency,
          platform: entities.platform,
          urls: entities.urls
        },
        tags
      };

      console.log('📊 Storing knowledge node in HyperGraph:', {
        nodeId: node.id,
        eventType: entities.eventType,
        entitiesCount: {
          wallets: entities.walletAddresses.length,
          suspects: entities.suspectAddresses.length,
          urls: entities.urls?.length || 0
        }
      });

      // Create GraphQL mutation for HyperGraph
      const mutation = this.buildCreateNodeMutation(node);

      const response = await axios.post(
        this.hypergraphEndpoint,
        {
          query: mutation,
          variables: {
            node: node
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      if (response.data.errors) {
        throw new Error(`HyperGraph GraphQL errors: ${JSON.stringify(response.data.errors)}`);
      }

      if (response.data.data) {
        console.log('✅ Knowledge node stored successfully in HyperGraph');
        return {
          success: true,
          nodeId: node.id
        };
      } else {
        throw new Error('No data returned from HyperGraph');
      }

    } catch (error: any) {
      console.error('❌ Failed to store knowledge node in HyperGraph:', error.message);
      
      // For development, store locally as backup
      await this.storeLocalBackup(blobId, investigationId, author, entities, tags);
      
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  private buildCreateNodeMutation(node: KnowledgeGraphNode): string {
    // GraphQL mutation to create a node in HyperGraph
    return `
      mutation CreateInvestigationNode($node: InvestigationNodeInput!) {
        createInvestigationNode(input: $node) {
          id
          blobId
          investigationId
          author
          createdAt
          entities {
            eventType
            walletAddresses
            suspectAddresses
            day
            date
            time
            location
            amount
            currency
            platform
            urls
          }
          tags
        }
      }
    `;
  }

  private async storeLocalBackup(
    blobId: string,
    investigationId: string,
    author: string,
    entities: ExtractedEntities,
    tags: string[]
  ): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const backupDir = path.join(process.cwd(), 'knowledge-graph-backup');
      
      // Ensure backup directory exists
      try {
        await fs.access(backupDir);
      } catch {
        await fs.mkdir(backupDir, { recursive: true });
      }

      const backup = {
        blobId,
        investigationId,
        author,
        entities,
        tags,
        timestamp: new Date().toISOString(),
        // Store in a simple JSON format for easy querying
        searchableData: {
          eventType: entities.eventType,
          walletAddresses: entities.walletAddresses,
          suspectAddresses: entities.suspectAddresses,
          date: entities.date,
          platform: entities.platform,
          location: entities.location
        }
      };

      const filename = `knowledge_${investigationId}_${Date.now()}.json`;
      const filepath = path.join(backupDir, filename);
      
      await fs.writeFile(filepath, JSON.stringify(backup, null, 2));
      console.log(`💾 Knowledge data backed up locally: ${filename}`);
      
      // Also maintain a searchable index
      await this.updateLocalIndex(backup);
      
    } catch (error) {
      console.error('Failed to create local backup:', error);
    }
  }

  private async updateLocalIndex(backup: any): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const indexPath = path.join(process.cwd(), 'knowledge-graph-backup', 'index.json');
      
      let index = [];
      try {
        const indexData = await fs.readFile(indexPath, 'utf8');
        index = JSON.parse(indexData);
      } catch {
        // Index doesn't exist yet, start with empty array
      }
      
      // Add new entry to index
      index.push({
        investigationId: backup.investigationId,
        blobId: backup.blobId,
        author: backup.author,
        timestamp: backup.timestamp,
        eventType: backup.searchableData.eventType,
        walletAddresses: backup.searchableData.walletAddresses,
        suspectAddresses: backup.searchableData.suspectAddresses,
        date: backup.searchableData.date,
        platform: backup.searchableData.platform,
        location: backup.searchableData.location
      });
      
      await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
      console.log('📇 Local knowledge index updated');
      
    } catch (error) {
      console.error('Failed to update local index:', error);
    }
  }

  async queryKnowledgeGraph(filters: {
    eventType?: string;
    walletAddress?: string;
    dateRange?: { start: string; end: string };
    platform?: string;
  }): Promise<{ success: boolean; nodes?: any[]; error?: string }> {
    try {
      // First try HyperGraph query
      const query = this.buildGraphQuery(filters);
      
      const response = await axios.post(
        this.hypergraphEndpoint,
        {
          query: query,
          variables: filters
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      if (response.data.errors) {
        console.warn('HyperGraph query errors, falling back to local search:', response.data.errors);
        return await this.queryLocalBackup(filters);
      }

      return {
        success: true,
        nodes: response.data.data?.investigations || []
      };

    } catch (error: any) {
      console.error('❌ Failed to query HyperGraph, trying local backup:', error.message);
      return await this.queryLocalBackup(filters);
    }
  }

  private async queryLocalBackup(filters: {
    eventType?: string;
    walletAddress?: string;
    dateRange?: { start: string; end: string };
    platform?: string;
  }): Promise<{ success: boolean; nodes?: any[]; error?: string }> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const indexPath = path.join(process.cwd(), 'knowledge-graph-backup', 'index.json');
      
      const indexData = await fs.readFile(indexPath, 'utf8');
      let nodes = JSON.parse(indexData);
      
      // Apply filters
      if (filters.eventType) {
        nodes = nodes.filter((node: any) => node.eventType === filters.eventType);
      }
      
      if (filters.walletAddress) {
        nodes = nodes.filter((node: any) => 
          node.walletAddresses.includes(filters.walletAddress) ||
          node.suspectAddresses.includes(filters.walletAddress)
        );
      }
      
      if (filters.platform) {
        nodes = nodes.filter((node: any) => node.platform === filters.platform);
      }
      
      // Sort by timestamp (newest first)
      nodes.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      return {
        success: true,
        nodes: nodes.slice(0, 100) // Limit to 100 results
      };
      
    } catch (error: any) {
      return {
        success: false,
        error: `Local backup query failed: ${error.message}`
      };
    }
  }

  private buildGraphQuery(filters: any): string {
    // GraphQL query for HyperGraph
    return `
      query GetInvestigations(
        $eventType: String
        $walletAddress: String
        $platform: String
      ) {
        investigations(
          where: {
            ${filters.eventType ? 'entities_: { eventType: $eventType }' : ''}
            ${filters.walletAddress ? 'entities_: { walletAddresses_contains: [$walletAddress] }' : ''}
            ${filters.platform ? 'entities_: { platform: $platform }' : ''}
          }
          orderBy: createdAt
          orderDirection: desc
          first: 100
        ) {
          id
          blobId
          investigationId
          author
          createdAt
          entities {
            eventType
            walletAddresses
            suspectAddresses
            day
            date
            time
            location
            amount
            currency
            platform
            urls
          }
          tags
        }
      }
    `;
  }
}