import React, { useState, useEffect } from 'react';
import { Card, DatePicker, Radio, Spin, Empty, Statistic, Row, Col, Divider } from 'antd';
import { BarChartOutlined, LineChartOutlined } from '@ant-design/icons';
import { Line, Column, Pie } from '@ant-design/plots';
import MainLayout from '@/components/layout/MainLayout';
import { aiService } from '@/services';
import styles from '@/styles/system/ai-stats.module.scss';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

/**
 * AI使用统计页面
 */
function AIStats() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([dayjs().subtract(30, 'day'), dayjs()]);
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month' | 'user'>('day');
  const [statsData, setStatsData] = useState<any>(null);

   // 避免重复调用
   useEffect(() => {
     // 添加防抖或节流
     const timer = setTimeout(() => {
       fetchStats();
     }, 300);
     return () => clearTimeout(timer);
   }, [dateRange, groupBy]);

  // 获取统计数据
  const fetchStats = async () => {
    setLoading(true);
    try {
      const params = {
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD'),
        groupBy,
      };

      let data: any = await aiService.getUsageStats(params);
      
      // 处理不同格式的响应数据
      if (data && typeof data === 'object') {
        // 如果返回了{count: 0}这样的格式
        if (data.count !== undefined && Object.keys(data).length === 1) {
          data = {
            totalTokens: 0,
            totalCost: 0,
            usageByDay: [],
            usageByModel: []
          };
        }
        // 确保数据结构符合预期
        if (!data.totalTokens) data.totalTokens = 0;
        if (!data.totalCost) data.totalCost = 0;
        if (!Array.isArray(data.usageByDay)) data.usageByDay = [];
        if (!Array.isArray(data.usageByModel)) data.usageByModel = [];
      } else {
        // 如果返回的不是对象，使用默认值
        data = {
          totalTokens: 0,
          totalCost: 0,
          usageByDay: [],
          usageByModel: []
        };
      }
      
      setStatsData(data);
    } catch (error) {
      console.error('获取AI使用统计失败:', error);
      setStatsData({
        totalTokens: 0,
        totalCost: 0,
        usageByDay: [],
        usageByModel: []
      });
    } finally {
      setLoading(false);
    }
  };

  // 日期范围变化处理
  const handleDateChange = (dates: any) => {
    if (dates && dates.length === 2) {
      setDateRange([dates[0], dates[1]]);
    }
  };

  // 分组方式变化处理
  const handleGroupByChange = (e: any) => {
    setGroupBy(e.target.value);
  };

  // 渲染统计卡片
  const renderStatisticCards = () => {
    if (!statsData) return null;

    const { totalTokens, totalCost } = statsData;

    return (
      <Row gutter={16} className={styles.statisticRow}>
        <Col span={12}>
          <Card>
            <Statistic
              title="总Token使用量"
              value={totalTokens}
              valueStyle={{ color: '#3f8600' }}
              prefix={<BarChartOutlined />}
              suffix="tokens"
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card>
            <Statistic
              title="总消费"
              value={(totalCost !== undefined && totalCost !== null) ? Number(totalCost).toFixed(2) : '0.00'}
              precision={2}
              valueStyle={{ color: '#cf1322' }}
              prefix="$"
            />
          </Card>
        </Col>
      </Row>
    );
  };

  // 渲染每日使用趋势图
  const renderDailyUsageChart = () => {
    if (!statsData || !statsData.usageByDay || !Array.isArray(statsData.usageByDay) || statsData.usageByDay.length === 0) return (
      <Empty description="暂无数据" />
    );

    const config = {
      data: statsData.usageByDay,
      xField: 'date',
      yField: 'tokens',
      smooth: true,
      meta: {
        tokens: {
          alias: 'Token使用量',
        },
        date: {
          alias: '日期',
        },
      },
      tooltip: {
        showMarkers: true,
        customItems: (originalItems: any[]) => {
          return originalItems.map(item => {
            return {
              name: 'Token使用量',
              value: `${item.data.tokens.toLocaleString()} tokens`
            };
          });
        }
      },
      color: '#1890ff',
      padding: 'auto',
      appendPadding: [10, 0, 0, 0],
      slider: {
        start: 0,
        end: 1,
      }
    };

    return <Line {...config} />;
  };

  // 渲染模型使用占比图
  const renderModelUsageChart = () => {
    if (!statsData || !statsData.usageByModel || !Array.isArray(statsData.usageByModel) || statsData.usageByModel.length === 0) return (
      <Empty description="暂无数据" />
    );

    const config = {
      data: statsData.usageByModel,
      angleField: 'tokens',
      colorField: 'model',
      radius: 0.7,
      padding: 'auto',
      label: {
        text: 'model',
        position: 'outside',
      },
      legend: {
        position: 'right',
      },
      tooltip: {
        customItems: (originalItems: any[]) => {
          return originalItems.map(item => {
            return {
              name: item.data.model,
              value: `${item.data.tokens.toLocaleString()} tokens (${item.data.cost ? `$${item.data.cost.toFixed(4)}` : '未计费'})`
            };
          });
        }
      },
      statistic: {
        title: false,
        content: {
          style: {
            whiteSpace: 'pre-wrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            fontSize: '16px'
          },
          content: '总计',
        },
      }
    };

    return <Pie {...config} />;
  };

  return (
    <MainLayout title="AI使用统计 - 系统设置">
      <div className={styles.container}>
        <Card
          title={
            <div className={styles.cardTitle}>
              <LineChartOutlined /> AI使用统计
            </div>
          }
          variant="borderless"
          className={styles.card}
          extra={
            <div className={styles.filterControls}>
              <RangePicker
                value={dateRange}
                onChange={handleDateChange}
                className={styles.datePicker}
                allowClear={false}
              />
              <Radio.Group value={groupBy} onChange={handleGroupByChange}>
                <Radio.Button value="day">按天</Radio.Button>
                <Radio.Button value="week">按周</Radio.Button>
                <Radio.Button value="month">按月</Radio.Button>
                {/* <Radio.Button value="user">按用户</Radio.Button> */}
              </Radio.Group>
            </div>
          }
        >
          <Spin spinning={loading}>
            {renderStatisticCards()}

            <Divider>Token使用趋势</Divider>
            <div className={styles.chartContainer}>
              {renderDailyUsageChart()}
            </div>

            <Divider>模型使用分布</Divider>
            <div className={styles.chartContainer}>
              {renderModelUsageChart()}
            </div>
          </Spin>
        </Card>
      </div>
    </MainLayout>
  );
}

export default AIStats; 