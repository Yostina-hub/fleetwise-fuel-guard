import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UserCheck, UserX, Award, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDriverStats } from "@/hooks/useDriverStats";
import { useTranslation } from "react-i18next";

const DriversOverviewCard = () => {
  const navigate = useNavigate();
  const { stats, loading } = useDriverStats();
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          {t('dashboard.driversOverview')}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => navigate('/drivers')}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-success/10">
              <UserCheck className="w-4 h-4 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{loading ? '-' : stats.active}</p>
              <p className="text-xs text-muted-foreground">{t('common.active')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-muted">
              <UserX className="w-4 h-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{loading ? '-' : stats.inactive}</p>
              <p className="text-xs text-muted-foreground">{t('common.inactive')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{loading ? '-' : stats.total}</p>
              <p className="text-xs text-muted-foreground">{t('common.total')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-warning/10">
              <Award className="w-4 h-4 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold">{loading ? '-' : stats.avgScore}</p>
              <p className="text-xs text-muted-foreground">{t('dashboard.avgScore')}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DriversOverviewCard;
