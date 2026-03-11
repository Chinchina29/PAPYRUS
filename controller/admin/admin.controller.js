import * as userService from '../../services/user.service.js';
import { successResponse, errorResponse } from '../../helper/response.helper.js';

export const signin = async (req, res) => {
    try {
        console.log('🔐 Admin signin attempt:', req.body);
        
        const { email, password } = req.body;
        
        if (!email || !password) {
            console.log('❌ Missing email or password');
            return res.status(400).json({ 
                success: false, 
                message: 'Email and password are required' 
            });
        }
        
        console.log('🔍 Looking for user with email:', email);
        const user = await userService.findUserByEmail(email);
        
        if (!user) {
            console.log('❌ User not found');
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid admin credentials' 
            });
        }
        
        console.log('👤 User found:', { email: user.email, role: user.role, blocked: user.isBlocked });
        
        if (user.role !== 'admin') {
            console.log('❌ User is not admin, role:', user.role);
            return res.status(400).json({ 
                success: false, 
                message: 'Access denied. Admin privileges required.' 
            });
        }
        
        if (user.isBlocked) {
            console.log('❌ Admin user is blocked');
            return res.status(400).json({ 
                success: false, 
                message: 'Account is blocked. Contact support.' 
            });
        }
        
        console.log('🔑 Verifying password...');
        const isMatch = await userService.comparePassword(password, user.password);
        console.log('🔑 Password match result:', isMatch);
        
        if (!isMatch) {
            console.log('❌ Password mismatch');
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid admin credentials' 
            });
        }
        
        console.log('💾 Setting up session...');
        req.session.userId = user._id.toString();
        req.session.user = {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role
        };
        
        console.log('✅ Admin login successful for:', email);
        console.log('📋 Session user:', req.session.user);
        
        return res.json({ 
            success: true, 
            message: 'Login successful',
            redirect: '/admin/dashboard'
        });
        
    } catch (error) {
        console.error('❌ Admin signin error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Server error: ' + error.message 
        });
    }
};

export const dashboard = async (req, res) => {
    try {
        console.log('🎯 Dashboard accessed by user:', req.session.user);
        
        const stats = {
            totalUsers: await userService.getTotalUsers() || 0,
            activeUsers: await userService.getActiveUsers() || 0,
            blockedUsers: await userService.getBlockedUsers() || 0,
            newUsersToday: 5,
            revenue: 45231,
            orders: 1234,
            revenueGrowth: 15,
            ordersGrowth: 23
        };
        
        console.log('📊 Stats created:', JSON.stringify(stats, null, 2));
        
        const recentUsers = await userService.getRecentUsers(3);
        console.log('👥 Recent users loaded:', recentUsers?.length || 0);
        
        const templateData = {
            user: req.session.user,
            stats,
            recentUsers: recentUsers || [],
            recentOrders: [
                { title: 'The Great Gatsby', customer: 'John Doe', price: 299, time: '2 min ago' },
                { title: 'To Kill a Mockingbird', customer: 'Jane Smith', price: 399, time: '5 min ago' },
                { title: '1984', customer: 'Mike Johnson', price: 349, time: '10 min ago' }
            ]
        };
        
        console.log('📋 Template data prepared:', Object.keys(templateData));
        
        res.render('admin/dashboard', templateData);
        
    } catch (error) {
        console.error('❌ Dashboard error:', error);
        res.status(500).render('error/500', { 
            error: 'Dashboard loading failed: ' + error.message 
        });
    }
};

export const getUserManagement = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const status = req.query.status || '';
        
        console.log('🔍 User management filters:', { page, limit, search, status });
        
        const result = await userService.getAllUsers(page, limit, search, status);
        
        res.render('admin/usermanagement', {
            user: req.session.user,
            users: result.users,
            currentPage: result.page,
            totalPages: result.totalPages,
            total: result.total,
            search: search,
            status: status
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).send('Server error');
    }
};

export const blockUnblockUser = async (req, res) => {
    try {
        console.log('🔄 Block/Unblock request:', req.body);
        const { userId } = req.body;
        
        if (!userId) {
            console.log('❌ No userId provided');
            return res.status(400).json({ 
                success: false, 
                message: 'User ID is required' 
            });
        }
        
        const user = await userService.toggleBlockUser(userId);
        if (!user) {
            console.log('❌ User not found:', userId);
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
        const message = user.isBlocked ? 'User blocked successfully' : 'User unblocked successfully';
        console.log('✅ User status updated:', { userId, isBlocked: user.isBlocked, message });
        
        return res.json({ 
            success: true, 
            message: message, 
            data: { isBlocked: user.isBlocked } 
        });
    } catch (error) {
        console.error('❌ Block/unblock error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Server error: ' + error.message 
        });
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
