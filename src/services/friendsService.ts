import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { FriendRequest, Friendship } from '../types/models';

// Send friend request
export const sendFriendRequest = async (
  fromUserId: string,
  toUserId: string
): Promise<FriendRequest> => {
  try {
    // Check if request already exists
    const existingQuery = query(
      collection(db, 'friendRequests'),
      where('fromUserId', '==', fromUserId),
      where('toUserId', '==', toUserId),
      where('status', '==', 'pending')
    );
    const existingSnap = await getDocs(existingQuery);

    if (!existingSnap.empty) {
      throw new Error('Friend request already sent');
    }

    // Check if already friends
    const friendshipQuery = query(
      collection(db, 'friendships'),
      where('user1Id', 'in', [fromUserId, toUserId]),
      where('user2Id', 'in', [fromUserId, toUserId])
    );
    const friendshipSnap = await getDocs(friendshipQuery);

    if (!friendshipSnap.empty) {
      throw new Error('Already friends');
    }

    // Get sender info
    const senderDoc = await getDoc(doc(db, 'users', fromUserId));
    const senderData = senderDoc.data();

    // Create friend request
    const requestRef = doc(collection(db, 'friendRequests'));
    const friendRequest: FriendRequest = {
      id: requestRef.id,
      fromUserId,
      fromUserName: senderData?.name || 'Unknown',
      fromUserPhoto: senderData?.photo,
      toUserId,
      status: 'pending',
      createdAt: new Date(),
    };

    await setDoc(requestRef, {
      ...friendRequest,
      createdAt: serverTimestamp(),
    });

    // Create notification for recipient
    await createNotification(
      toUserId,
      'friend_request',
      'New Friend Request',
      `${friendRequest.fromUserName} sent you a friend request`,
      `/friends?requestId=${requestRef.id}`
    );

    return friendRequest;
  } catch (error) {
    console.error('Error sending friend request:', error);
    throw error;
  }
};

// Accept friend request
export const acceptFriendRequest = async (requestId: string): Promise<void> => {
  try {
    const requestRef = doc(db, 'friendRequests', requestId);
    const requestSnap = await getDoc(requestRef);

    if (!requestSnap.exists()) {
      throw new Error('Friend request not found');
    }

    const request = requestSnap.data() as FriendRequest;

    // Create friendship
    const friendshipRef = doc(collection(db, 'friendships'));
    const friendship: Friendship = {
      id: friendshipRef.id,
      user1Id: request.fromUserId,
      user2Id: request.toUserId,
      createdAt: new Date(),
    };

    await setDoc(friendshipRef, {
      ...friendship,
      createdAt: serverTimestamp(),
    });

    // Update both users' friend lists
    await updateDoc(doc(db, 'users', request.fromUserId), {
      friends: arrayUnion(request.toUserId),
    });

    await updateDoc(doc(db, 'users', request.toUserId), {
      friends: arrayUnion(request.fromUserId),
    });

    // Update request status
    await updateDoc(requestRef, {
      status: 'accepted',
      respondedAt: serverTimestamp(),
    });

    // Create notification for requester
    const recipientDoc = await getDoc(doc(db, 'users', request.toUserId));
    const recipientName = recipientDoc.data()?.name || 'Someone';

    await createNotification(
      request.fromUserId,
      'friend_request',
      'Friend Request Accepted',
      `${recipientName} accepted your friend request`,
      '/friends'
    );
  } catch (error) {
    console.error('Error accepting friend request:', error);
    throw error;
  }
};

// Reject friend request
export const rejectFriendRequest = async (requestId: string): Promise<void> => {
  try {
    const requestRef = doc(db, 'friendRequests', requestId);
    await updateDoc(requestRef, {
      status: 'rejected',
      respondedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error rejecting friend request:', error);
    throw error;
  }
};

// Remove friend
export const removeFriend = async (userId: string, friendId: string): Promise<void> => {
  try {
    // Find and delete friendship
    const friendshipQuery = query(
      collection(db, 'friendships'),
      where('user1Id', 'in', [userId, friendId]),
      where('user2Id', 'in', [userId, friendId])
    );
    const friendshipSnap = await getDocs(friendshipQuery);

    friendshipSnap.forEach(async (doc) => {
      await deleteDoc(doc.ref);
    });

    // Update both users' friend lists
    await updateDoc(doc(db, 'users', userId), {
      friends: arrayRemove(friendId),
    });

    await updateDoc(doc(db, 'users', friendId), {
      friends: arrayRemove(userId),
    });
  } catch (error) {
    console.error('Error removing friend:', error);
    throw error;
  }
};

// Get pending friend requests for a user
export const getPendingFriendRequests = async (userId: string): Promise<FriendRequest[]> => {
  try {
    const requestsQuery = query(
      collection(db, 'friendRequests'),
      where('toUserId', '==', userId),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(requestsQuery);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
      } as FriendRequest;
    });
  } catch (error) {
    console.error('Error getting friend requests:', error);
    return [];
  }
};

// Get user's friends
export const getUserFriends = async (userId: string): Promise<any[]> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    const friendIds = userDoc.data()?.friends || [];

    if (friendIds.length === 0) return [];

    // Get friend details
    const friends = await Promise.all(
      friendIds.map(async (friendId: string) => {
        const friendDoc = await getDoc(doc(db, 'users', friendId));
        if (friendDoc.exists()) {
          return { ...friendDoc.data(), uid: friendDoc.id };
        }
        return null;
      })
    );

    return friends.filter(f => f !== null);
  } catch (error) {
    console.error('Error getting friends:', error);
    return [];
  }
};

// Search for users
export const searchUsers = async (searchTerm: string, currentUserId: string): Promise<any[]> => {
  try {
    // Note: This is a simple implementation. For production, consider using Algolia or similar
    const usersQuery = query(
      collection(db, 'users'),
      where('role', '==', 'student')
    );

    const snapshot = await getDocs(usersQuery);
    const users = snapshot.docs
      .map(doc => ({ ...doc.data(), uid: doc.id }) as any)
      .filter((user: any) => 
        user.uid !== currentUserId &&
        (user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         user.email?.toLowerCase().includes(searchTerm.toLowerCase()))
      );

    return users;
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
};

// Helper function to create notifications
const createNotification = async (
  userId: string,
  type: string,
  title: string,
  message: string,
  actionUrl?: string
): Promise<void> => {
  try {
    const notificationRef = doc(collection(db, 'notifications'));
    await setDoc(notificationRef, {
      id: notificationRef.id,
      userId,
      type,
      title,
      message,
      read: false,
      actionUrl,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};
