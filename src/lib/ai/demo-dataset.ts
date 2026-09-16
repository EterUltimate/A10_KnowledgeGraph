/**
 * 内置《数据结构》演示数据集（离线模式兜底）
 * 用途：
 *  1. 未配置 LLM Key 时，上传链路仍能生成结构完整的知识图谱（满足联调/演示/自动化测试）；
 *  2. 为 e2e 测试提供稳定数据；
 *  3. 作为知识抽取格式与质量的对标示例（见 docs/prompt-engineering.md）。
 * 版权说明：以下段落为项目组自编的示例性内容，非任何教材原文。
 */
import type { KnowledgePoint, Relation, TextChunk } from '@/types';

export const DEMO_COURSE_ID = 'data-structures';
export const DEMO_COURSE_NAME = '数据结构';

interface DemoNode {
  name: string;
  definition: string;
  chapter: string;
  difficulty: number;
  /** 自编教材段落（离线问答的检索语料） */
  textbook: string;
}

const DEMO_NODES: DemoNode[] = [
  // 第一章 绪论
  { name: '数据结构', definition: '研究数据的组织、存储与操作方式的一门学科，是编写高效程序的基础。', chapter: '绪论', difficulty: 1, textbook: '数据结构研究数据的逻辑结构、存储结构以及在其上定义的操作集合。选择合适的数据结构能够显著提高程序的运行效率。数据结构是计算机类专业的核心基础课程。' },
  { name: '算法', definition: '解决特定问题的一系列明确、有限的计算步骤。', chapter: '绪论', difficulty: 1, textbook: '算法是解决特定问题的有限步骤序列，具有输入、输出、确定性、有穷性和可行性五个重要特性。同一个问题往往存在多种算法，需要在正确性的前提下比较其效率。' },
  { name: '时间复杂度', definition: '用大 O 记号描述算法运行时间随输入规模增长的趋势。', chapter: '绪论', difficulty: 2, textbook: '时间复杂度用大 O 记号表示，如 O(1)、O(log n)、O(n)、O(n log n)、O(n²)。分析时间复杂度时关注最深层语句的执行次数与问题规模 n 的关系，通常考虑最坏情况。' },
  { name: '空间复杂度', definition: '算法运行所需额外存储空间随输入规模增长的趋势。', chapter: '绪论', difficulty: 2, textbook: '空间复杂度同样用大 O 记号描述。原地排序算法空间复杂度为 O(1)，归并排序需要 O(n) 的辅助数组。时间与空间往往可以相互换取。' },
  // 第二章 线性表
  { name: '线性表', definition: 'n 个相同类型元素的有限序列，是最基本、最常用的线性数据结构。', chapter: '线性表', difficulty: 1, textbook: '线性表是由 n 个元素构成的有限序列，支持按位序查找、插入、删除等基本操作。线性表有两种典型存储方式：顺序表和链表。线性表是学习栈、队列等后续结构的基础。' },
  { name: '顺序表', definition: '用一段连续存储单元依次存放线性表元素的存储结构。', chapter: '线性表', difficulty: 2, textbook: '顺序表使用连续内存存放元素，支持 O(1) 随机访问，但插入与删除平均需要移动一半元素，为 O(n)。顺序表的存储密度高，适合静态、频繁随机读取的场景。' },
  { name: '链表', definition: '通过指针链接结点来存储线性表的非连续存储结构。', chapter: '线性表', difficulty: 2, textbook: '链表的每个结点包含数据域与指针域，插入删除只需修改指针，为 O(1)（定位后），但访问第 i 个元素必须从头遍历，为 O(n)。链表按需分配空间，适合频繁插入删除的场景。' },
  { name: '单链表', definition: '每个结点只含一个后继指针的链表。', chapter: '线性表', difficulty: 2, textbook: '单链表结点只指向后继，只能从头结点开始单向遍历。设置头结点可以统一空表与非空表的插入删除逻辑。单链表是最简单的链式结构。' },
  { name: '双向链表', definition: '结点同时含前驱与后继指针的链表。', chapter: '线性表', difficulty: 3, textbook: '双向链表的每个结点有 prior 和 next 两个指针，可以 O(1) 找到前驱，删除结点无须再找前驱结点。代价是每结点多一个指针的空间开销。' },
  { name: '循环链表', definition: '尾结点指针指回头结点形成环的链表。', chapter: '线性表', difficulty: 3, textbook: '循环链表使尾结点的 next 指回头结点，从任何结点出发都能遍历全表。用尾指针表示的循环链表可以在 O(1) 时间实现表头表尾操作的衔接，适合环形调度等场景。' },
  // 第三章 栈和队列
  { name: '栈', definition: '只允许在一端进行插入删除的线性表，后进先出（LIFO）。', chapter: '栈和队列', difficulty: 2, textbook: '栈限定在栈顶进行插入与删除，具有后进先出的特性。栈的典型应用包括函数调用、表达式求值、括号匹配、深度优先搜索等。栈可由顺序表或链表实现。' },
  { name: '队列', definition: '只允许一端入队、另一端出队的线性表，先进先出（FIFO）。', chapter: '栈和队列', difficulty: 2, textbook: '队列在队尾插入、队头删除，具有先进先出特性。队列的典型应用包括任务排队、广度优先搜索、缓冲区管理等。队列同样可由数组或链表实现。' },
  { name: '循环队列', definition: '用数组配合取模运算实现的队列，可循环利用存储空间。', chapter: '栈和队列', difficulty: 3, textbook: '循环队列将数组首尾相连，通过 (rear+1) % maxSize 取模避免假溢出。判满与判空需要牺牲一个单元或引入 size 计数。循环队列是数组实现队列的标准做法。' },
  { name: '表达式求值', definition: '利用操作数栈与运算符栈按优先级计算中缀表达式。', chapter: '栈和队列', difficulty: 3, textbook: '表达式求值使用两个栈：操作数栈与运算符栈。扫描表达式时根据运算符优先级决定入栈或弹出计算，是栈最经典的应用之一。后缀表达式求值只需一个操作数栈。' },
  { name: '递归', definition: '函数直接或间接调用自身的程序设计方法。', chapter: '栈和队列', difficulty: 3, textbook: '递归函数通过调用栈保存每层返回地址与局部变量。递归代码简洁但存在栈溢出风险，尾递归或可改写为迭代。递归是理解树和图的遍历算法的基础。' },
  // 第四章 树与二叉树
  { name: '树', definition: 'n 个结点的有限集合，具有唯一根结点且其余结点分为若干互不相交的子树。', chapter: '树与二叉树', difficulty: 2, textbook: '树是重要的非线性结构，含唯一根结点，子树之间互不相交。常用术语包括结点的度、深度、层次、双亲与孩子。树的存储可采用双亲表示法、孩子表示法与孩子兄弟表示法。' },
  { name: '二叉树', definition: '每个结点至多有两棵子树且子树有左右之分的树形结构。', chapter: '树与二叉树', difficulty: 3, textbook: '二叉树每个结点最多两个孩子，且左右子树次序不可颠倒。满二叉树与完全二叉树是两种特殊形态，完全二叉树适合顺序存储。二叉树是二叉搜索树、堆等结构的基础。' },
  { name: '二叉搜索树', definition: '左子树所有结点小于根、右子树所有结点大于根的二叉树。', chapter: '树与二叉树', difficulty: 4, textbook: '二叉搜索树（BST）满足左小右大性质，查找、插入、删除的平均时间复杂度为 O(log n)，退化为链时为 O(n)。中序遍历二叉搜索树可得到递增有序序列。' },
  { name: '堆', definition: '完全二叉树且任一结点值不大于（或不小于）其子结点值的结构。', chapter: '树与二叉树', difficulty: 4, textbook: '大顶堆与 小顶堆分别保证根结点是最大/最小值。堆支持 O(log n) 的插入与删除堆顶，适合优先队列与 Top-K 问题。堆排序也基于堆实现。' },
  { name: '哈夫曼树', definition: '带权路径长度最小的二叉树，又称最优二叉树。', chapter: '树与二叉树', difficulty: 4, textbook: '哈夫曼树通过每次合并权值最小的两棵树构造，使整体带权路径长度最小。哈夫曼编码基于哈夫曼树，是一种无前缀编码，广泛用于数据压缩。' },
  { name: '树的遍历', definition: '按某种次序访问树中每个结点一次的过程。', chapter: '树与二叉树', difficulty: 3, textbook: '二叉树遍历分先序、中序、后序与层序四种。前三种可用递归或栈实现，层序遍历使用队列。已知先序与中序、或后序与中序可以唯一确定一棵二叉树。' },
  // 第五章 图
  { name: '图', definition: '由顶点集与边集组成的非线性结构，边可带权。', chapter: '图', difficulty: 3, textbook: '图 G 由顶点集 V 与边集 E 组成，分为有向图与无向图，边可带权值构成网。图是描述多对多关系的通用模型，广泛用于交通网络、社交网络等场景。' },
  { name: '邻接矩阵', definition: '用二维数组存储顶点间邻接关系的图存储方式。', chapter: '图', difficulty: 3, textbook: '邻接矩阵用 n×n 数组表示边是否存在，判断任意两点是否相邻为 O(1)，空间开销 O(n²)，适合稠密图。无向图的邻接矩阵是对称矩阵。' },
  { name: '邻接表', definition: '为每个顶点挂接一条邻接边链表的图存储方式。', chapter: '图', difficulty: 3, textbook: '邻接表为每个顶点维护一个边链表，空间复杂度 O(n+e)，适合稀疏图。求某顶点的所有邻接点只需遍历其边链表，但判断两点是否相邻需要遍历链表。' },
  { name: '图的遍历', definition: '从某顶点出发访问图中全部顶点一次的过程，含 DFS 与 BFS。', chapter: '图', difficulty: 3, textbook: '深度优先搜索（DFS）借助栈或递归沿一条路径走到底再回溯；广度优先搜索（BFS）借助队列按层扩展。两种遍历的时间复杂度均为 O(n+e)，遍历产生生成树。' },
  { name: '最短路径', definition: '求图中两顶点之间权值和最小的路径，经典算法为 Dijkstra 与 Floyd。', chapter: '图', difficulty: 4, textbook: 'Dijkstra 算法按路径长度递增次序求单源最短路径，时间复杂度 O(n²)，要求边权非负。Floyd 算法通过动态规划求任意两点间最短路径，时间复杂度 O(n³)。' },
  { name: '最小生成树', definition: '连通网中权值和最小的生成树，经典算法为 Prim 与 Kruskal。', chapter: '图', difficulty: 4, textbook: '最小生成树包含图中全部顶点且边权和最小。Prim 算法逐点扩展，适合稠密图；Kruskal 算法按边权从小到大选边并用并查集判环，适合稀疏图。两者都有贪心性质。' },
  { name: '拓扑排序', definition: '将有向无环图的顶点排成线性序列，使每条边起点都在终点之前。', chapter: '图', difficulty: 4, textbook: '拓扑排序针对有向无环图（DAG），借助入度表与队列实现：入度为零的顶点出队并将其邻接点入度减一。拓扑序列可用于安排课程先修计划、工程工序等。' },
  // 第六章 查找
  { name: '查找', definition: '在数据集合中寻找满足条件元素的过程。', chapter: '查找', difficulty: 2, textbook: '查找是在数据集合中定位特定元素的操作，衡量指标是平均查找长度（ASL）。按结构可分为线性表查找、树表查找与哈希查找三类。查找是几乎所有系统的核心操作。' },
  { name: '顺序查找', definition: '从头到尾逐个比较的查找方式，适用于任何线性表。', chapter: '查找', difficulty: 1, textbook: '顺序查找从表头开始逐一比较，成功时平均查找长度约为 (n+1)/2。它对数据无任何要求，实现简单，但效率低，适合小规模或无序数据。' },
  { name: '二分查找', definition: '在有序表上每次将查找区间折半的高效查找方式。', chapter: '查找', difficulty: 3, textbook: '二分查找要求数据有序且支持随机访问，每次比较排除一半区间，时间复杂度 O(log n)。判定二分查找过程可画出一棵二叉判定树，其查找长度不超过树高。' },
  { name: '哈希表', definition: '通过哈希函数将关键字映射到存储地址的查找结构。', chapter: '查找', difficulty: 3, textbook: '哈希表在关键字与存储位置间建立直接映射，理想情况下查找为 O(1)。不同关键字映射到同一地址称为冲突，常用开放定址法或链地址法处理。装填因子影响冲突概率。' },
  // 第七章 排序
  { name: '排序', definition: '将数据按关键字递增或递减重新排列的过程。', chapter: '排序', difficulty: 2, textbook: '排序按策略分为插入、交换、选择、归并和基数五大类。评价排序算法的指标是时间复杂度、空间复杂度与稳定性。内部排序针对内存数据，外部排序还需考虑磁盘读写。' },
  { name: '冒泡排序', definition: '相邻元素两两比较、逆序交换的简单交换排序。', chapter: '排序', difficulty: 2, textbook: '冒泡排序每趟将最大元素"冒泡"到末尾，时间复杂度 O(n²)，最好情况（已有序）为 O(n)。冒泡排序是稳定排序，实现简单，适合教学与小规模数据。' },
  { name: '快速排序', definition: '以枢轴划分使左小右大、再递归处理两侧的分治排序。', chapter: '排序', difficulty: 3, textbook: '快速排序选择枢轴将序列划分为两部分再递归，平均时间复杂度 O(n log n)，最坏（基本有序）退化为 O(n²)。快排是不稳定排序，是平均性能最好的内部排序之一。' },
  { name: '归并排序', definition: '将两个有序子序列合并为一个有序序列的分治排序。', chapter: '排序', difficulty: 3, textbook: '归并排序递归地将序列二分后合并，时间复杂度稳定在 O(n log n)，需要 O(n) 辅助空间。归并排序是稳定排序，也是外部排序与多路归并的基础。' },
  { name: '堆排序', definition: '利用大顶堆反复取出最大元素的基于选择的排序。', chapter: '排序', difficulty: 4, textbook: '堆排序先建大顶堆，再每次将堆顶与末尾交换并重新调整，时间复杂度稳定为 O(n log n)，空间 O(1)。堆排序是不稳定排序，适合大规模数据与内存受限场景。' },
];

/** 演示知识点（含稳定 id，便于测试断言） */
export const DEMO_KNOWLEDGE: KnowledgePoint[] = DEMO_NODES.map((n, i) => ({
  id: `demo-k${i}`,
  name: n.name,
  definition: n.definition,
  chapter: n.chapter,
  difficulty: n.difficulty,
  source: '内置演示数据集《数据结构》',
  courseId: DEMO_COURSE_ID,
}));

/** 演示教材段落（nodeId -> 教材段落文本） */
export const DEMO_TEXTBOOK: Record<string, string> = Object.fromEntries(
  DEMO_NODES.map((n) => [n.name, n.textbook]),
);

/** 演示教材段落转 RAG 文本块（上传文件解析为空时的问答语料兜底） */
export function demoTextbookChunks(courseId: string): TextChunk[] {
  return DEMO_NODES.map((n, i) => ({
    id: `${courseId}-demo-chunk${i}`,
    courseId,
    content: `${n.name}：${n.textbook}`,
    chapter: n.chapter,
    source: '内置演示数据集《数据结构》',
  }));
}

/** 演示关系（覆盖三类，前置链可用于学习路径演示） */
export const DEMO_RELATIONS: Relation[] = [
  // 前置关系 PREREQUISITE
  { source: '数据结构', target: '线性表', type: 'PREREQUISITE' },
  { source: '线性表', target: '栈', type: 'PREREQUISITE' },
  { source: '线性表', target: '队列', type: 'PREREQUISITE' },
  { source: '栈', target: '递归', type: 'PREREQUISITE' },
  { source: '栈', target: '表达式求值', type: 'PREREQUISITE' },
  { source: '队列', target: '循环队列', type: 'PREREQUISITE' },
  { source: '栈', target: '树的遍历', type: 'PREREQUISITE' },
  { source: '树', target: '二叉树', type: 'PREREQUISITE' },
  { source: '二叉树', target: '二叉搜索树', type: 'PREREQUISITE' },
  { source: '二叉树', target: '堆', type: 'PREREQUISITE' },
  { source: '二叉树', target: '哈夫曼树', type: 'PREREQUISITE' },
  { source: '树', target: '树的遍历', type: 'PREREQUISITE' },
  { source: '图', target: '邻接矩阵', type: 'PREREQUISITE' },
  { source: '图', target: '邻接表', type: 'PREREQUISITE' },
  { source: '图', target: '图的遍历', type: 'PREREQUISITE' },
  { source: '邻接矩阵', target: '最短路径', type: 'PREREQUISITE' },
  { source: '图的遍历', target: '最短路径', type: 'PREREQUISITE' },
  { source: '图的遍历', target: '最小生成树', type: 'PREREQUISITE' },
  { source: '图的遍历', target: '拓扑排序', type: 'PREREQUISITE' },
  { source: '查找', target: '二分查找', type: 'PREREQUISITE' },
  { source: '顺序表', target: '二分查找', type: 'PREREQUISITE' },
  { source: '查找', target: '哈希表', type: 'PREREQUISITE' },
  { source: '排序', target: '冒泡排序', type: 'PREREQUISITE' },
  { source: '排序', target: '快速排序', type: 'PREREQUISITE' },
  { source: '递归', target: '快速排序', type: 'PREREQUISITE' },
  { source: '排序', target: '归并排序', type: 'PREREQUISITE' },
  { source: '递归', target: '归并排序', type: 'PREREQUISITE' },
  { source: '排序', target: '堆排序', type: 'PREREQUISITE' },
  { source: '堆', target: '堆排序', type: 'PREREQUISITE' },
  // 包含关系 CONTAINS
  { source: '线性表', target: '顺序表', type: 'CONTAINS' },
  { source: '线性表', target: '链表', type: 'CONTAINS' },
  { source: '链表', target: '单链表', type: 'CONTAINS' },
  { source: '链表', target: '双向链表', type: 'CONTAINS' },
  { source: '链表', target: '循环链表', type: 'CONTAINS' },
  { source: '查找', target: '顺序查找', type: 'CONTAINS' },
  { source: '查找', target: '二分查找', type: 'CONTAINS' },
  { source: '查找', target: '哈希表', type: 'CONTAINS' },
  { source: '排序', target: '冒泡排序', type: 'CONTAINS' },
  { source: '排序', target: '快速排序', type: 'CONTAINS' },
  { source: '排序', target: '归并排序', type: 'CONTAINS' },
  { source: '排序', target: '堆排序', type: 'CONTAINS' },
  // 相关关系 RELATED
  { source: '数据结构', target: '算法', type: 'RELATED' },
  { source: '时间复杂度', target: '空间复杂度', type: 'RELATED' },
  { source: '算法', target: '时间复杂度', type: 'RELATED' },
  { source: '栈', target: '队列', type: 'RELATED' },
  { source: '顺序表', target: '链表', type: 'RELATED' },
  { source: '二叉搜索树', target: '二分查找', type: 'RELATED' },
  { source: '哈希表', target: '哈夫曼树', type: 'RELATED' },
  { source: '最短路径', target: '最小生成树', type: 'RELATED' },
  { source: '二叉树', target: '堆', type: 'RELATED' },
  { source: '快速排序', target: '冒泡排序', type: 'RELATED' },
];
