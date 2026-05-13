import { ExternalLink } from "@/components/ExternalLink";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { chainConfig, explorerAddressUrl } from "@/lib/chains";
import { contracts } from "@/lib/contracts";
import { env } from "@/lib/env";

const descriptions = [
  ["MockUSDC", "Test USDC used to mint mTRWA tokens on Sepolia."],
  ["ReserveOracle", "Chainlink Functions-backed oracle that stores adjusted off-chain reserve data."],
  ["MockReserveOracle", "Mock oracle contract retained in deployment metadata for testing."],
  ["RWAMintControllerVault", "Mints and redeems mTRWA using MockUSDC, oracle reserve data, and vault liquidity."],
  ["RWAToken", "ERC-20 mTRWA token. Sepolia is canonical; Amoy is the destination-chain representation."],
  ["RWATokenBridge", "CCIP sender bridge used to transfer mTRWA representation between Sepolia and Amoy."],
  ["TokenPool", "CCIP token pool contract wired to the source or destination mTRWA token for cross-chain movement."],
] as const;

export function MetadataPage() {
  return (
    <div>
      <PageHeader
        title="Project metadata"
        description="Addresses, links, and contract roles for the deployed RWA tokenization prototype."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <ContractTable title="Sepolia contracts" chain="sepolia" entries={Object.entries(contracts.sepolia)} />
        <ContractTable title="Polygon Amoy contracts" chain="amoy" entries={Object.entries(contracts.amoy)} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Project links</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-start gap-3">
            <ExternalLink href={env.oracleApiUrl}>Oracle API endpoint</ExternalLink>
            <ExternalLink href={env.oracleAdminUrl}>Oracle API admin</ExternalLink>
            <ExternalLink href={env.ccipExplorerUrl}>CCIP Explorer</ExternalLink>
            <ExternalLink href={env.ccipTokenManagerUrl}>CCIP Token Manager (mTRWA)</ExternalLink>
            {env.githubRepoUrl ? (
              <ExternalLink href={env.githubRepoUrl}>GitHub repository</ExternalLink>
            ) : (
              <Badge variant="outline">GitHub repository placeholder</Badge>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Contract roles</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contract</TableHead>
                  <TableHead>Purpose</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {descriptions.map(([name, description]) => (
                  <TableRow key={name}>
                    <TableCell className="font-medium">{name}</TableCell>
                    <TableCell>{description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ContractTable({
  title,
  chain,
  entries,
}: {
  title: string;
  chain: "sepolia" | "amoy";
  entries: Array<[string, { address: string }]>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Address</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map(([name, contract]) => (
              <TableRow key={name}>
                <TableCell className="font-medium">{name}</TableCell>
                <TableCell>
                  <ExternalLink href={explorerAddressUrl(chain, contract.address)}>{contract.address}</ExternalLink>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="mt-3 text-xs text-muted-foreground">
          Explorer: <ExternalLink href={chainConfig[chain].explorerUrl}>{chainConfig[chain].explorerUrl}</ExternalLink>
        </p>
      </CardContent>
    </Card>
  );
}
