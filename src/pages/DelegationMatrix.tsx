import Layout from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Users, History } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AuthorityMatrixTab } from "@/components/delegation/AuthorityMatrixTab";
import { SubstitutionsTab } from "@/components/delegation/SubstitutionsTab";
import { DelegationHistoryTab } from "@/components/delegation/DelegationHistoryTab";

const DelegationMatrix = () => {
  const { t } = useTranslation();

  return (
    <Layout>
      <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">
              {t("pages.delegation_matrix.title", "Delegation of Authority")}
            </h1>
            <p className="text-muted-foreground text-xs">
              Managed in FMS · Configure approval rules and temporary substitutions
            </p>
          </div>
        </div>

        <Tabs defaultValue="authority" className="space-y-4">
          <TabsList>
            <TabsTrigger value="authority" className="gap-2">
              <Shield className="h-4 w-4" />
              Authority Matrix
            </TabsTrigger>
            <TabsTrigger value="substitutions" className="gap-2">
              <Users className="h-4 w-4" />
              Substitutions
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="authority">
            <AuthorityMatrixTab />
          </TabsContent>

          <TabsContent value="substitutions">
            <SubstitutionsTab />
          </TabsContent>

          <TabsContent value="history">
            <DelegationHistoryTab />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default DelegationMatrix;
