import * as userService from '../../services/user.service.js';
import { successResponse, errorResponse } from '../../helper/response.helper.js';

export const signin = async (req, res) => {
    console.log('Admin signin attempt:', req.body);
    
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email and password required' 
            });
        }
        
        const user = await userService.findUserByEmail(email);
        if (!user || user.role !== 'admin') {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid admin credentials' 
            });
        }
        
        const isMatch = await userService.comparePassword(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid admin credentials' 
            });
        }
        
        req.session.userId = user._id.toString();
        req.session.user = {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role
        };
        
        return res.json({ 
            success: true, 
            message: 'Login successful',
            redirect: '/admin/dashboard'
        });
        
    } catch (error) {
        console.error('Admin signin error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Server error' 
        });
    }
};

export const dashboard = async (req, res) => {
    try {
        const stats = {
            totalUsers: await userService.getTotalUsers() || 0,
            activeUsers: await userService.getActiveUsers() || 0,
            blockedUsers: await userService.getBlockedUsers() || 0,
            newUsersToday: 5
        };
        
        res.render('admin/dashboard', {
            user: req.session.user,
            stats,
            recentUsers: [],
            chartData: {
                userGrowth: [12, 19, 3, 5, 2, 3, 9, 15, 8, 12, 6, 4],
                monthlySignups: [65, 59, 80, 81, 56, 55, 40, 89, 76, 45, 67, 88]
            },
            recentActivity: [
                { action: 'New user registered', user: 'John Doe', time: '2 minutes ago' },
                { action: 'User blocked', user: 'Jane Smith', time: '15 minutes ago' }
            ]
        });
        
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ success: false, message: 'Dashboard error' });
    }
};

export const getUserManagement = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        
        const result = await userService.getAllUsers(page, limit, search);
        
        res.render('admin/usermanagement', {
            users: result.users,
            currentPage: result.page,
            totalPages: result.totalPages,
            total: result.total,
            search: search
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).send('Server error');
    }
};

export const blockUnblockUser = async (req, res) => {
    try {
        const { userId } = req.body;
        
        const user = await userService.toggleBlockUser(userId);
        if (!user) {
            return errorResponse(res, 'User not found', 404);
        }
        
        const message = user.isBlocked ? 'User blocked successfully' : 'User unblocked successfully';
        return successResponse(res, message, { isBlocked: user.isBlocked });
    } catch (error) {
        console.error('Block/unblock error:', error);
        return errorResponse(res, 'Server error', 500);
    }
};

export const logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return errorResponse(res, 'Error logging out', 500);
        }
        res.redirect('/admin/signin');
    });
};
