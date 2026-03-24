import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getProjectAnalytics = async (req, res) => {
  try {
    const { projectId } = req.params;

    const [tasks, members, stickyNotes, activities] = await Promise.all([
      prisma.task.findMany({
        where: { project_id: projectId },
        include: { assignee: { select: { id: true, name: true } } },
        orderBy: { created_at: 'asc' }
      }),
      prisma.projectMember.findMany({
        where: { project_id: projectId },
        include: { user: { select: { id: true, name: true, role: true } } }
      }),
      prisma.stickyNote.findMany({
        where: { task: { project_id: projectId } },
        include: { task: { select: { title: true } } }
      }),
      prisma.activityEvent.findMany({
        where: { project_id: projectId },
        orderBy: { created_at: 'desc' },
        take: 100
      })
    ]);

    // --- Core Metrics ---
    const doneTasks = tasks.filter(t => t.status === 'DONE');
    const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS');
    const reviewTasks = tasks.filter(t => t.status === 'REVIEW');
    const pendingTasks = tasks.filter(t => t.status === 'PENDING');

    const metrics = {
      total: tasks.length,
      done: doneTasks.length,
      inProgress: inProgressTasks.length,
      review: reviewTasks.length,
      pending: pendingTasks.length,
      memberCount: members.length,
      totalNotes: stickyNotes.length
    };

    // --- Avg Completion Time (hours) ---
    const completedWithTime = doneTasks.filter(t => t.started_at && t.completed_at);
    const avgCompletionHours = completedWithTime.length > 0
      ? Math.round(completedWithTime.reduce((sum, t) => {
          return sum + (new Date(t.completed_at) - new Date(t.started_at)) / 3600000;
        }, 0) / completedWithTime.length)
      : null;

    // --- Priority Breakdown ---
    const priorityBreakdown = [
      { name: 'High',   value: tasks.filter(t => t.priority === 1).length, color: '#ef4444' },
      { name: 'Medium', value: tasks.filter(t => t.priority === 2).length, color: '#f59e0b' },
      { name: 'Low',    value: tasks.filter(t => t.priority === 3).length, color: '#22c55e' },
    ].filter(p => p.value > 0);

    // --- In-Progress task chips ---
    const inProgressChips = inProgressTasks.map(t => ({
      id: t.id,
      title: t.title,
      assignee: t.assignee?.name || 'Unassigned',
      startedAt: t.started_at
    }));

    // --- Oldest unfinished task ---
    const unfinished = tasks.filter(t => t.status !== 'DONE').sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const oldestPending = unfinished[0] ? {
      title: unfinished[0].title,
      assignee: unfinished[0].assignee?.name,
      createdAt: unfinished[0].created_at,
      status: unfinished[0].status
    } : null;

    // --- Workload Imbalance ---
    const activeTasks = tasks.filter(t => t.status !== 'DONE');
    const devLoadMap = {};
    activeTasks.forEach(t => {
      const dev = t.assignee?.name || 'Unassigned';
      devLoadMap[dev] = (devLoadMap[dev] || 0) + 1;
    });
    const developerLoad = Object.keys(devLoadMap).map(k => ({
      name: k,
      tasks: devLoadMap[k]
    })).sort((a, b) => b.tasks - a.tasks);

    // --- Activity velocity: events in last 7 days ---
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600000);
    const recentActivityCount = activities.filter(a => new Date(a.created_at) >= sevenDaysAgo).length;

    // --- Smart Insights ---
    const insights = [];

    const bottleneckWarning = reviewTasks.length > 0 && reviewTasks.length >= Math.ceil(tasks.length * 0.25);
    if (bottleneckWarning) {
      insights.push({
        type: 'WARNING',
        title: 'Bottleneck Detected',
        text: `${reviewTasks.length} tasks are stuck in Review (${Math.round((reviewTasks.length / tasks.length) * 100)}% of total). This blocks deployment throughput.`
      });
    }

    if (developerLoad.length > 1) {
      const highest = developerLoad[0];
      const lowest = developerLoad[developerLoad.length - 1];
      if (highest.tasks > lowest.tasks + 2 && highest.name !== 'Unassigned') {
        insights.push({
          type: 'ALERT',
          title: 'Workload Imbalance',
          text: `${highest.name} carries ${highest.tasks} active tasks vs ${lowest.name}'s ${lowest.tasks}. Consider reassigning for balanced velocity.`
        });
      }
    } else if (developerLoad.length === 1 && developerLoad[0].tasks > 5) {
      insights.push({
        type: 'WARNING',
        title: 'Developer Overloaded',
        text: `${developerLoad[0].name} has ${developerLoad[0].tasks} active tasks. Overloading a single developer reduces overall quality and speed.`
      });
    }

    if (pendingTasks.length > 0 && inProgressTasks.length === 0) {
      insights.push({
        type: 'WARNING',
        title: 'No Active Work',
        text: `There are ${pendingTasks.length} pending tasks but none are currently in progress. The team may be blocked or unassigned.`
      });
    }

    if (avgCompletionHours !== null && avgCompletionHours > 72) {
      insights.push({
        type: 'ALERT',
        title: 'Slow Completion Rate',
        text: `Average task completion time is ${avgCompletionHours}h. Tasks are taking longer than 3 days on average to close.`
      });
    }

    if (insights.length === 0) {
      insights.push({
        type: 'SUCCESS',
        title: 'Healthy Workflow',
        text: 'No bottlenecks, balanced workload, and active team velocity detected. Keep up the great work!'
      });
    }

    // --- Daily Summary ---
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const completedToday = doneTasks.filter(t => t.completed_at && new Date(t.completed_at) >= today).length;
    const createdToday = tasks.filter(t => new Date(t.created_at) >= today).length;
    const dailySummary = { completedToday, createdToday, netBurn: completedToday - createdToday };

    // --- Trend Data ---
    const historyMap = {};
    tasks.forEach(t => {
      const dk = new Date(t.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' });
      if (!historyMap[dk]) historyMap[dk] = { date: dk, created: 0, completed: 0 };
      historyMap[dk].created += 1;
    });
    doneTasks.filter(t => t.completed_at).forEach(t => {
      const dk = new Date(t.completed_at).toLocaleDateString([], { month: 'short', day: 'numeric' });
      if (!historyMap[dk]) historyMap[dk] = { date: dk, created: 0, completed: 0 };
      historyMap[dk].completed += 1;
    });
    const trendData = Object.values(historyMap);

    // --- Overall Summary ---
    const completionRate = tasks.length > 0 ? Math.round((doneTasks.length / tasks.length) * 100) : 0;
    const overallSummary = {
      completionRate,
      avgCompletionHours,
      recentActivityCount,
      oldestPending,
      totalStickyNotes: stickyNotes.length
    };

    return res.json({
      success: true,
      data: {
        metrics,
        developerLoad,
        insights,
        dailySummary,
        trendData,
        inProgressChips,
        priorityBreakdown,
        overallSummary
      }
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
